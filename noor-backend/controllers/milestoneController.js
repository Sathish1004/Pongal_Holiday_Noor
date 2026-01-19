const db = require('../config/db');

// Helper ensureIsoDate (reused from siteController)
const ensureIsoDate = (dateStr) => {
    if (!dateStr || dateStr === 'null' || dateStr === '') return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return dateStr;
};

// Create a new Milestone
exports.createMilestone = async (req, res) => {
    try {
        const { siteId, name, plannedWaitDate, plannedEndDate, phaseIds } = req.body;
        // NOTE: Frontend sending 'plannedWaitDate' -> mapped to start, or strict start/end
        // Let's assume standard names from request
        const startDate = ensureIsoDate(req.body.plannedStartDate);
        const endDate = ensureIsoDate(req.body.plannedEndDate);

        const [result] = await db.query(
            `INSERT INTO milestones (site_id, name, planned_start_date, planned_end_date, status) 
             VALUES (?, ?, ?, ?, 'Not Started')`,
            [siteId, name, startDate, endDate]
        );

        const milestoneId = result.insertId;

        // Link Phases if provided
        if (phaseIds && phaseIds.length > 0) {
            await db.query(`UPDATE phases SET milestone_id = ? WHERE id IN (?)`, [milestoneId, phaseIds]);
        }

        res.status(201).json({ message: 'Milestone created successfully', milestoneId });
    } catch (error) {
        console.error('Error creating milestone:', error);
        res.status(500).json({ message: 'Error creating milestone' });
    }
};

// Get Milestones for a Site (including linked phases and basic progress stats)
exports.getMilestonesBySite = async (req, res) => {
    try {
        const { siteId } = req.params;

        // 1. Get Milestones
        const [milestones] = await db.query(`
            SELECT m.* 
            FROM milestones m
            WHERE m.site_id = ?
            ORDER BY m.planned_end_date ASC
        `, [siteId]);

        // 2. For each milestone, calculate progress based on linked phases -> tasks
        for (let m of milestones) {
            // Get linked phases
            const [phases] = await db.query(`SELECT id, name FROM phases WHERE milestone_id = ?`, [m.id]);
            m.phases = phases;

            if (phases.length > 0) {
                const phaseIds = phases.map(p => p.id);
                // Get task stats for these phases
                const [stats] = await db.query(`
                    SELECT 
                        COUNT(*) as total_tasks,
                        SUM(CASE WHEN status = 'Completed' OR status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
                    FROM tasks 
                    WHERE phase_id IN (?)
                `, [phaseIds]);

                const total = stats[0].total_tasks || 0;
                const completed = stats[0].completed_tasks || 0;

                // Progress Calculation
                // Rule: If total > 0, progress = (completed/total) * 100
                m.progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                // Phase-based Auto Status Update (Optional: could serve as a check)
                if (m.progress === 100 && m.status !== 'Completed') {
                    // Suggestion: Don't auto-complete milestone, Admin does it manually?
                    // Request says: "Admin approves final stage... A milestone becomes “Ready for Completion”"
                    // So we keep status manual or update 'progress' field only. 
                    // We will update the progress column in DB for future quick access
                    await db.query('UPDATE milestones SET progress = ? WHERE id = ?', [m.progress, m.id]);
                } else {
                    // Update progress anyway
                    await db.query('UPDATE milestones SET progress = ? WHERE id = ?', [m.progress, m.id]);
                }
            } else {
                m.progress = 0;
            }

            // Check Delay Logic
            // If current date > planned_end_date AND status != Completed => Delayed
            const today = new Date();
            const endDate = new Date(m.planned_end_date);
            if (m.planned_end_date && today > endDate && m.status !== 'Completed') {
                m.is_delayed = true;
                if (m.status !== 'Delayed') {
                    // Update to Delayed in DB if not already
                    // await db.query('UPDATE milestones SET status = "Delayed" WHERE id = ?', [m.id]);
                    // Only display as Delayed, maybe don't overwrite manual status immediately unless strictly required
                    // User Request: "If planned end date is exceeded -> mark milestone as Delayed"
                    // Let's return is_delayed flag for UI, and maybe one-time DB update?
                    // Better to just calculate it on read or update it via a scheduled job. 
                    // For now, UI renders 'Delayed' based on logic.
                }
            }
        }

        res.json(milestones);
    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.status(500).json({ message: 'Error fetching milestones' });
    }
};

// Update Milestone
exports.updateMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, plannedStartDate, plannedEndDate, delayReason, phaseIds } = req.body;

        const sDate = ensureIsoDate(plannedStartDate);
        const eDate = ensureIsoDate(plannedEndDate);

        // Update basic fields
        let query = 'UPDATE milestones SET name = ?, status = ?, planned_start_date = ?, planned_end_date = ?';
        const params = [name, status, sDate, eDate];

        if (delayReason) {
            query += ', delay_reason = ?';
            params.push(delayReason);
        }

        if (status === 'Completed') {
            query += ', actual_completion_date = NOW()';
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        // Update Phase Links
        if (phaseIds) {
            // First unlink all currently linked to this milestone
            await db.query(`UPDATE phases SET milestone_id = NULL WHERE milestone_id = ?`, [id]);

            // Link new ones
            if (phaseIds.length > 0) {
                await db.query(`UPDATE phases SET milestone_id = ? WHERE id IN (?)`, [id, phaseIds]);
            }
        }

        res.json({ message: 'Milestone updated successfully' });
    } catch (error) {
        console.error('Error updating milestone:', error);
        res.status(500).json({ message: 'Error updating milestone' });
    }
};

// Delete Milestone
exports.deleteMilestone = async (req, res) => {
    try {
        const { id } = req.params;

        // Unlink phases first (redundant if ON DELETE SET NULL, but safe)
        await db.query('UPDATE phases SET milestone_id = NULL WHERE milestone_id = ?', [id]);

        await db.query('DELETE FROM milestones WHERE id = ?', [id]);

        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        console.error('Error deleting milestone:', error);
        res.status(500).json({ message: 'Error deleting milestone' });
    }
};
