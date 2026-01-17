const db = require('../config/db');

exports.getOverallReport = async (req, res) => {
    try {
        const { fromDate, toDate, projectIds } = req.query;
        let dateFilter = "";
        let projectFilter = "";
        const params = [];

        // --- Filters ---
        if (fromDate && toDate) {
            // Applies to task created_at/completed_at depending on context, using created_at generally for "report period"
            // For specific sections like "Financial Summary", it applies to transaction date.
            // This is complex for a global filter. Let's apply it where it makes most sense.
            // For now, simpler to fetch snapshot data.
            // If strictly needed, we would add WHERE clauses to every sub-query.
        }

        if (projectIds) {
            const ids = projectIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (ids.length > 0) {
                projectFilter = `AND s.id IN (${ids.join(',')})`;
            }
        }

        // --- A. Company Overview ---
        const [companyOverview] = await db.query(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                SUM(CASE WHEN status = 'delayed' OR status = 'pending' THEN 1 ELSE 0 END) as on_hold_projects
            FROM sites s
            WHERE 1=1 ${projectFilter}
        `);

        const [employeeStats] = await db.query(`
            SELECT COUNT(*) as total_employees,
            (SELECT COUNT(DISTINCT employee_id) FROM site_assignments) as active_employees
            FROM employees
            WHERE role != 'admin'
        `);

        // --- B. Project Summary ---
        const [projectSummary] = await db.query(`
            SELECT 
                s.id, s.name, s.location, s.start_date, s.status, s.budget,
                (SELECT COUNT(*) FROM tasks t WHERE t.site_id = s.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.site_id = s.id AND t.status = 'completed') as completed_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.site_id = s.id AND t.status = 'waiting_for_approval') as waiting_approval_tasks,
                (SELECT COUNT(*) FROM phases p WHERE p.site_id = s.id) as total_stages,
                AVG(t.progress) as progress
            FROM sites s
            LEFT JOIN tasks t ON s.id = t.site_id
            WHERE 1=1 ${projectFilter}
            GROUP BY s.id
        `);

        // --- C. Task Status Overview ---
        const [taskOverview] = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.status = 'waiting_for_approval' OR t.status = 'waiting approval' THEN 1 ELSE 0 END) as waiting_approval_tasks,
                SUM(CASE WHEN t.status = 'pending' OR t.status = 'in_progress' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN t.status != 'completed' AND t.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            WHERE 1=1 ${projectFilter}
        `);

        // --- D. Phase / Stage Progress Summary ---
        const [phaseSummary] = await db.query(`
            SELECT 
                p.id, p.name, s.name as project_name, p.status, p.budget,
                (SELECT COUNT(*) FROM tasks t WHERE t.phase_id = p.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.phase_id = p.id AND t.status = 'completed') as completed_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.phase_id = p.id AND (t.status = 'waiting_for_approval' OR t.status = 'waiting approval')) as pending_approval_tasks
            FROM phases p
            JOIN sites s ON p.site_id = s.id
            WHERE 1=1 ${projectFilter}
        `);

        // --- E. Financial Summary ---
        // Calculate allocated budget per project (sum of phases) and total spent
        const [financials] = await db.query(`
             SELECT 
                SUM(p.budget) as total_allocated_budget, -- Sum of phase budgets
                (
                    SELECT SUM(amount) FROM transactions tr 
                    JOIN sites s2 ON tr.site_id = s2.id 
                    WHERE tr.type = 'OUT' ${projectFilter.replace('s.', 's2.')}
                ) as total_expenses,
                (
                     SELECT SUM(amount) FROM transactions tr 
                     JOIN sites s3 ON tr.site_id = s3.id 
                     WHERE tr.type = 'IN' ${projectFilter.replace('s.', 's3.')}
                ) as total_received
             FROM phases p
             JOIN sites s ON p.site_id = s.id
             WHERE 1=1 ${projectFilter}
        `);

        // Phase-wise financial details
        const [phaseFinancials] = await db.query(`
            SELECT 
                p.name as phase_name, s.name as project_name, p.budget as allocated,
                (SELECT COALESCE(SUM(amount),0) FROM transactions tr WHERE tr.phase_id = p.id AND tr.type = 'OUT') as used
            FROM phases p
            JOIN sites s ON p.site_id = s.id
            WHERE 1=1 ${projectFilter}
        `);


        // --- F. Material Summary ---
        const [materialSummary] = await db.query(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN m.status = 'Approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN m.status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN m.status = 'Received' THEN 1 ELSE 0 END) as received
            FROM material_requests m
            JOIN sites s ON m.site_id = s.id
            WHERE 1=1 ${projectFilter}
        `);

        // --- G. Employee Performance Summary ---
        const [employeePerformance] = await db.query(`
            SELECT 
                e.id, e.name, e.role,
                (SELECT COUNT(*) FROM tasks t WHERE t.employee_id = e.id) as assigned_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.employee_id = e.id AND t.status = 'completed') as completed_tasks,
                (SELECT name FROM sites WHERE id = (SELECT site_id FROM site_assignments sa WHERE sa.employee_id = e.id LIMIT 1)) as current_project
                -- Add rejection count if 'rejected' status is tracked in tasks or messages. Assuming standard statuses for now.
            FROM employees e
            WHERE e.role != 'admin'
        `);


        // --- H. Delays & Risk Indicators ---
        // Tasks delayed beyond due date (Limit to top 20 for report)
        const [delayedTasks] = await db.query(`
            SELECT t.name, t.due_date, s.name as project_name, e.name as assigned_to
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE t.status != 'completed' AND t.due_date < CURDATE() ${projectFilter}
            ORDER BY t.due_date ASC
            LIMIT 20
        `);

        // Phases over budget
        const overBudgetPhases = phaseFinancials.filter(p => p.used > p.allocated);


        const reportData = {
            generatedAt: new Date(),
            companyOverview: {
                ...companyOverview[0],
                total_employees: employeeStats[0].total_employees,
                active_employees: employeeStats[0].active_employees
            },
            projectSummary: projectSummary.map(p => ({
                ...p,
                completion_percentage: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0
            })),
            taskOverview: taskOverview[0],
            phaseSummary: phaseSummary.map(p => ({
                ...p,
                completion_percentage: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0
            })),
            financialSummary: {
                total_budget: financials[0].total_allocated_budget || 0,
                total_in: financials[0].total_received || 0,
                total_out: financials[0].total_expenses || 0,
                balance: (financials[0].total_received || 0) - (financials[0].total_expenses || 0),
                phase_details: phaseFinancials
            },
            materialSummary: materialSummary[0],
            employeePerformance: employeePerformance.map(e => ({
                ...e,
                performance_status: (e.completed_tasks / e.assigned_tasks > 0.8) ? 'Good' : (e.completed_tasks / e.assigned_tasks > 0.5) ? 'Average' : 'Needs Attention'
            })),
            risks: {
                delayed_tasks: delayedTasks,
                over_budget_phases: overBudgetPhases
            }
        };

        res.json(reportData);

    } catch (error) {
        console.error('Error generating overall report:', error);
        res.status(500).json({ message: 'Error generating overall report' });
    }
};
