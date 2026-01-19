const db = require('../config/db');

// Helper to check and complete milestones based on site progress
const checkAndCompleteMilestones = async (siteId) => {
    try {
        console.log(`[MilestoneCheck] Checking milestones for site ${siteId}...`);

        // 1. Get all milestones for this site
        const [milestones] = await db.query(
            'SELECT * FROM milestones WHERE site_id = ? AND status != "Completed"',
            [siteId]
        );

        if (milestones.length === 0) return;

        for (const milestone of milestones) {
            // 2. Get all phases linked to this milestone (Ordered by last one first)
            const [phases] = await db.query(
                'SELECT id FROM phases WHERE milestone_id = ? ORDER BY order_num DESC',
                [milestone.id]
            );

            if (phases.length === 0) continue; // No phases linked, can't auto-complete

            const phaseIds = phases.map(p => p.id);
            const lastPhaseId = phases[0].id; // The last phase in the sequence

            // 3. Check if ALL tasks in these phases are completed
            // logic: If there is ANY task that is NOT 'Completed' (case insensitive), then milestone is not done.
            const [incompleteTasks] = await db.query(
                `SELECT count(*) as count 
                 FROM tasks 
                 WHERE phase_id IN (?) 
                 AND LOWER(status) != 'completed'`,
                [phaseIds]
            );

            const pendingCount = incompleteTasks[0].count;

            if (pendingCount === 0) {
                // MILESTONE ACHIEVED!
                console.log(`[MilestoneCheck] Milestone "${milestone.name}" ACHIEVED!`);

                // A. Update Status
                await db.query(
                    'UPDATE milestones SET status = "Completed", actual_completion_date = CURDATE() WHERE id = ?',
                    [milestone.id]
                );

                // B. Insert System Chat Message
                // Using stage_messages table, linked to the last phase of the milestone
                // Inject System Message
                const today = new Date();
                const todayStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const message = `🏆 Achievement Unlocked: ${milestone.name} completed on ${todayStr}!`;
                if (phases.length > 0) { // Using 'phases' array which is already defined
                    await db.query(`
                    INSERT INTO stage_messages (phase_id, sender_id, content, type, created_at)
                    VALUES (?, 1, ?, 'system', NOW())
                `, [lastPhaseId, message]); // Using lastPhaseId which is already defined
                }
                // C. (Optional) Create Notification for Admin/Manager
                // This would require notificationHelper or direct insert. 
                // For now, the chat message acts as the primary record.
            }
        }

    } catch (error) {
        console.error('[MilestoneCheck] Error:', error);
    }
};

module.exports = {
    checkAndCompleteMilestones
};
