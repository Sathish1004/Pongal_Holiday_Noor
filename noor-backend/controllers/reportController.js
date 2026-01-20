const db = require('../config/db');

exports.getOverallReport = async (req, res) => {

    try {
        const { fromDate, toDate, projectIds } = req.query;
        let projectFilter = "";
        let transactionProjectFilter = "";

        // Date Filters
        // If dates are provided, we filter transactional data (Expenses, Received, Task Completions, Activity)
        // If not, we default to "All Time" (or Current Month if frontend enforces it)
        let dateFilter = "";
        let transactionDateFilter = "";
        let taskCompletionDateFilter = "";
        let activityDateFilter = "";

        if (fromDate && toDate) {
            const start = new Date(fromDate).toISOString().split('T')[0];
            const end = new Date(toDate).toISOString().split('T')[0];

            // For Transactions (Use full timestamp range to catch all activity)
            transactionDateFilter = `AND date >= '${start} 00:00:00' AND date <= '${end} 23:59:59'`;

            // For Task Completion (Status changed in range)
            taskCompletionDateFilter = `AND updated_at >= '${start} 00:00:00' AND updated_at <= '${end} 23:59:59'`;

            // For Activity (Updates, Requests)
            activityDateFilter = `AND created_at >= '${start} 00:00:00' AND created_at <= '${end} 23:59:59'`;
        }

        if (projectIds) {
            const ids = projectIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (ids.length > 0) {
                projectFilter = `AND s.id IN (${ids.join(',')})`;
                transactionProjectFilter = `AND site_id IN (${ids.join(',')})`;
            }
        }

        // --- A. Company Overview ---
        // Projects are "State Based", so date filter applies less directly, usually show current status.
        const [companyOverview] = await db.query(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                SUM(CASE WHEN status = 'on_hold' OR status = 'pending' THEN 1 ELSE 0 END) as on_hold_projects,
                (SELECT COUNT(DISTINCT site_id) FROM tasks WHERE status != 'completed' AND due_date < CURDATE()) as projects_with_delays
            FROM sites s
            WHERE 1=1 ${projectFilter}
        `);

        // Active Employees (Filtered by Date Range if provided, else Today)
        const activeEmpQuery = fromDate && toDate ? `
            SELECT COUNT(DISTINCT employee_id) as count FROM (
                SELECT employee_id FROM task_updates WHERE 1=1 ${activityDateFilter}
                UNION
                SELECT employee_id FROM material_requests WHERE 1=1 ${activityDateFilter}
                UNION
                SELECT employee_id FROM task_assignments WHERE 1=1 ${activityDateFilter.replace(/created_at/g, 'assigned_at')}
            ) as activity
        ` : `
            SELECT COUNT(DISTINCT employee_id) as count FROM (
                SELECT employee_id FROM task_updates WHERE DATE(created_at) = CURDATE()
                UNION
                SELECT employee_id FROM material_requests WHERE DATE(created_at) = CURDATE()
                UNION
                SELECT employee_id FROM task_assignments WHERE DATE(assigned_at) = CURDATE()
            ) as activity
        `;

        const [activeEmployees] = await db.query(activeEmpQuery);

        const [employeeStats] = await db.query(`
            SELECT COUNT(*) as total_employees FROM employees WHERE role != 'admin'
        `);

        // --- B. Financial Overview ---
        // Sum of Phase Budgets (Total vs Transactions in Range)
        const [financials] = await db.query(`
            SELECT 
                (SELECT SUM(s.budget) FROM sites s WHERE 1=1 ${projectFilter}) as total_allocated_budget,
                (SELECT SUM(amount) FROM transactions tr JOIN sites s ON tr.site_id = s.id WHERE tr.type = 'OUT' ${projectFilter.replace('s.', 's.')} ${transactionDateFilter}) as total_expenses,
                (SELECT SUM(amount) FROM transactions tr JOIN sites s ON tr.site_id = s.id WHERE tr.type = 'IN' ${projectFilter.replace('s.', 's.')} ${transactionDateFilter}) as total_received
        `);

        const totalAllocated = financials[0].total_allocated_budget || 0;
        const totalExpenses = financials[0].total_expenses || 0;
        const totalReceived = financials[0].total_received || 0;
        const balance = totalReceived - totalExpenses;
        // Utilization based on Total Allocated vs Expense-in-Period (might be confusing if period is short, but accurate to request)
        // If Period is "All Time", it matches total. 
        const utilization = totalAllocated > 0 ? (totalExpenses / totalAllocated) * 100 : 0;

        // Count Over-Budget Projects (Snapshot of total spent, as "Over Budget" is a state)
        const [projectFinancials] = await db.query(`
             SELECT 
                s.id, s.name,
                (SELECT SUM(budget) FROM phases WHERE site_id = s.id) as allocated,
                (SELECT SUM(amount) FROM transactions WHERE site_id = s.id AND type = 'OUT') as spent
             FROM sites s
             WHERE 1=1 ${projectFilter}
        `);
        const overBudgetProjects = projectFinancials.filter(p => (p.spent || 0) > (p.allocated || 0)).length;


        // --- C. Project-Wise Detailed Status ---
        // Snapshot data mainly
        const [projectSummary] = await db.query(`
            SELECT 
                s.id, s.name, s.location, s.status, s.start_date, s.end_date, s.budget,
                (SELECT COALESCE(AVG(progress), 0) FROM tasks WHERE site_id = s.id) as overall_progress,
                (SELECT COUNT(*) FROM tasks WHERE site_id = s.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks WHERE site_id = s.id AND status != 'completed' AND due_date < CURDATE()) as delayed_tasks_count,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks, -- Period Activity
                SUM(CASE WHEN t.status = 'waiting_for_approval' THEN 1 ELSE 0 END) as pending_approvals,
                 (SELECT SUM(budget) FROM phases WHERE site_id = s.id) as total_allocated
            FROM sites s
            LEFT JOIN tasks t ON s.id = t.site_id ${taskCompletionDateFilter ? taskCompletionDateFilter.replace(/updated_at/g, 't.updated_at') : ''}
            WHERE 1=1 ${projectFilter}
            GROUP BY s.id
        `);

        // --- D. Phase Progress Summary (Nested in Project usually, but fetching flattened for report) ---
        const [phaseSummary] = await db.query(`
            SELECT 
                p.id, p.name, p.site_id, s.name as project_name, p.status, p.budget,
                AVG(t.progress) as progress,
                (SELECT SUM(amount) FROM transactions tr WHERE tr.phase_id = p.id AND tr.type = 'OUT') as amount_used,
                (SELECT COUNT(*) FROM tasks t2 WHERE t2.phase_id = p.id AND t2.status = 'waiting_for_approval') as pending_approvals
            FROM phases p
            JOIN sites s ON p.site_id = s.id
            LEFT JOIN tasks t ON p.id = t.phase_id ${taskCompletionDateFilter ? taskCompletionDateFilter.replace(/updated_at/g, 't.updated_at') : ''}
            WHERE 1=1 ${projectFilter}
            GROUP BY p.id
        `);

        // --- E. Task Analytics ---
        const [taskStats] = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.status = 'pending' OR t.status = 'in_progress' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN t.status = 'waiting_for_approval' THEN 1 ELSE 0 END) as waiting_approval,
                SUM(CASE WHEN t.status != 'completed' AND t.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
                SUM(CASE WHEN t.status = 'completed' AND DATE(t.completed_at) = CURDATE() THEN 1 ELSE 0 END) as completed_today,
                SUM(CASE WHEN t.status = 'completed' AND YEARWEEK(t.completed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) as completed_this_week
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            WHERE 1=1 ${projectFilter} ${taskCompletionDateFilter ? taskCompletionDateFilter.replace(/updated_at/g, 't.updated_at') : ''}
        `);

        // Average Completion Time (in days)
        const [avgTime] = await db.query(`
            SELECT AVG(DATEDIFF(completed_at, created_at)) as avg_days
            FROM tasks 
            WHERE status = 'completed' AND completed_at IS NOT NULL
        `);


        // --- F. Material & Resource Report ---
        const [materialSummary] = await db.query(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN mr.status = 'Approved' THEN 1 ELSE 0 END) as approved_requests,
                SUM(CASE WHEN mr.status = 'Pending' THEN 1 ELSE 0 END) as pending_requests,
                SUM(CASE WHEN mr.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_requests,
                SUM(CASE WHEN mr.status = 'Received' THEN 1 ELSE 0 END) as delivered_requests
            FROM material_requests mr
            JOIN sites s ON mr.site_id = s.id
            WHERE 1=1 ${projectFilter}
            ${activityDateFilter ? activityDateFilter.replace(/created_at/g, 'mr.created_at') : ''}
        `);

        // Material Costs - derived from 'OUT' transactions generally
        // Ideally we filter by description or category if available, defaulting to all OUT transactions for 'Materials/Resources' context as mostly that's what expenses are.
        // We'll use the total_expenses calculated earlier.


        // --- G. Employee Performance Insights ---
        const [employeePerformance] = await db.query(`
            SELECT 
                e.id, e.name, e.role,
                COALESCE(e.status, 'Active') as status,
                COUNT(t.id) as assigned_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.status IN ('pending', 'in_progress', 'change_required') THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN t.status != 'completed' AND t.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
                SUM(CASE WHEN t.status = 'completed' AND t.completed_at <= t.due_date THEN 1 ELSE 0 END) as on_time_tasks,
                AVG(CASE WHEN t.status = 'completed' THEN DATEDIFF(t.completed_at, t.created_at) ELSE NULL END) as avg_completion_days,
                
                (SELECT COUNT(*) FROM notifications n WHERE n.employee_id = e.id AND n.type = 'TASK_REJECTED') as rejection_count,
                
                (SELECT MAX(updated_at) FROM (
                    SELECT created_at as updated_at FROM task_updates WHERE employee_id = e.id
                    UNION ALL
                    SELECT completed_at FROM tasks WHERE completed_by = e.id
                ) as u) as last_activity

            FROM employees e
            LEFT JOIN task_assignments ta ON e.id = ta.employee_id
            LEFT JOIN tasks t ON ta.task_id = t.id ${taskCompletionDateFilter ? taskCompletionDateFilter.replace(/updated_at/g, 't.updated_at') : ''}
            WHERE e.role != 'admin'
            GROUP BY e.id, e.name, e.role, e.status
        `);


        // --- H. Risk & Alerts ---
        // 1. Stuck Approvals (Waiting > 3 days)
        const [stuckApprovals] = await db.query(`
            SELECT t.id, t.name, t.completed_at, s.name as project_name 
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            WHERE t.status = 'waiting_for_approval' 
            AND t.completed_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
            ${projectFilter}
        `);

        // 2. Phases with Zero Progress
        const [zeroProgressPhases] = await db.query(`
            SELECT p.id, p.name, s.name as project_name
            FROM phases p
            JOIN sites s ON p.site_id = s.id
            LEFT JOIN tasks t ON p.id = t.phase_id
            WHERE 1=1 ${projectFilter}
            GROUP BY p.id
            HAVING COUNT(t.id) > 0 AND SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) = 0
            AND MIN(t.start_date) < CURDATE()
        `);


        // --- I. Communication & Audit Log ---
        // Just summary counts for now
        const [auditSummary] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM task_messages WHERE type = 'system') as total_system_msgs,
                (SELECT COUNT(*) FROM tasks WHERE DATE(approved_at) = CURDATE()) as tasks_approved_today,
                (SELECT COUNT(*) FROM material_requests WHERE status = 'Approved' AND DATE(updated_at) = CURDATE()) as materials_approved_today
        `);

        // Timestamps
        const [lastActions] = await db.query(`
            SELECT 
                (SELECT MAX(created_at) FROM notifications WHERE type LIKE '%ADMIN%') as last_admin_action,
                (SELECT MAX(created_at) FROM task_updates) as last_employee_update
        `);

        // --- J. Milestones Summary (NEW) ---
        const [milestones] = await db.query(`
            SELECT m.*, s.name as site_name,
            (
                SELECT 
                    CASE WHEN COUNT(t.id) > 0 
                    THEN ROUND((SUM(CASE WHEN t.status = 'completed' OR t.status = 'Completed' THEN 1 ELSE 0 END) / COUNT(t.id)) * 100)
                    ELSE 0 END
                FROM phases p
                JOIN tasks t ON p.id = t.phase_id
                WHERE p.milestone_id = m.id
            ) as dynamic_progress,
            (
                SELECT MAX(t.completed_at)
                FROM phases p
                JOIN tasks t ON p.id = t.phase_id
                WHERE p.milestone_id = m.id
            ) as derived_completion_date
            FROM milestones m
            JOIN sites s ON m.site_id = s.id
            WHERE 1=1 ${projectFilter}
            ORDER BY m.planned_end_date ASC
        `);

        // Use dynamic_progress if available to ensure fresh data, 
        // BUT trust the DB 'Completed' status OR if progress is already 100 (manual completion)
        milestones.forEach(m => {
            if (m.status === 'Completed' || m.progress === 100) {
                m.progress = 100;
                m.status = 'Completed'; // Ensure consistency for frontend
            } else if (m.dynamic_progress !== null && m.dynamic_progress !== undefined) {
                m.progress = m.dynamic_progress;
            }
        });

        // Calculate progress for each if needed or trust DB 'progress'
        // For report, we trust the 'progress' column which we update on read

        const milestoneStats = {
            total: milestones.length,
            completed: milestones.filter(m => m.status === 'Completed').length,
            delayed: milestones.filter(m => m.status === 'Delayed' || (m.status !== 'Completed' && new Date(m.planned_end_date) < new Date())).length,
            in_progress: milestones.filter(m => m.status === 'In Progress').length,
            latest_achievement_date: milestones.filter(m => m.status === 'Completed').sort((a, b) => new Date(b.actual_completion_date || b.updated_at).getTime() - new Date(a.actual_completion_date || a.updated_at).getTime())[0]?.actual_completion_date
        };

        // --- K. Activity Trends (Chart Data) ---
        // Get tasks completed in the last 7 days (or selected range)
        const dateLimit = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateUpper = toDate || new Date().toISOString().split('T')[0];

        const [activityTrends] = await db.query(`
            SELECT DATE(completed_at) as date, COUNT(*) as count 
            FROM tasks
            WHERE status IN ('completed', 'waiting_for_approval')
            AND completed_at >= ? AND completed_at <= ? + INTERVAL 1 DAY
            ${transactionProjectFilter.replace('s.', '')} -- tasks usually don't have direct s. but we join sites? No, transactionProjectFilter relies on site join usually.
            -- Actually tasks table has site_id directly? Let's check schema.
            -- Tasks table has site_id. So we can use site_id filter.
            AND site_id IN (SELECT id FROM sites s WHERE 1=1 ${projectFilter})
            GROUP BY DATE(completed_at)
            ORDER BY date ASC
        `, [dateLimit, dateUpper]);

        const reportData = {
            generatedAt: new Date(),
            companyOverview: {
                total_projects: companyOverview[0].total_projects,
                active_projects: companyOverview[0].active_projects,
                completed_projects: companyOverview[0].completed_projects,
                on_hold_projects: companyOverview[0].on_hold_projects,
                total_employees: employeeStats[0].total_employees,
                active_employees_today: activeEmployees[0].count,
                projects_with_delays: companyOverview[0].projects_with_delays
            },
            financialSummary: {
                total_estimated_budget: totalAllocated, // Assuming allocated is "estimated" as per phases
                total_allocated: totalAllocated,
                total_received: totalReceived,
                total_expenses: totalExpenses,
                balance: balance,
                utilization_percentage: utilization.toFixed(1),
                over_budget_projects_count: overBudgetProjects
            },
            projectSummary: projectSummary.map(p => ({
                ...p,
                progress: Math.round(p.overall_progress || 0),
                days_behind: p.delayed_tasks_count > 0 ? 'Yes (Delayed Tasks)' : '0' // Simplified logic
            })),
            phaseSummary: phaseSummary.map(p => ({
                ...p,
                progress: Math.round(p.progress || 0),
                remaining_budget: (p.budget || 0) - (p.amount_used || 0),
                is_over_budget: (p.amount_used || 0) > (p.budget || 0)
            })),
            taskStatistics: {
                ...taskStats[0],
                avg_completion_time_days: avgTime[0].avg_days ? Number(avgTime[0].avg_days).toFixed(1) : 0
            },
            materialOverview: {
                ...materialSummary[0],
                material_cost: totalExpenses // Using total expenses as proxy for material cost
            },
            employeePerformance: employeePerformance.map(e => ({
                ...e,
                avg_completion_days: e.avg_completion_days ? Number(e.avg_completion_days).toFixed(1) : '0.0',
                performance_score: e.assigned_tasks > 0 ? Math.round((e.completed_tasks / e.assigned_tasks) * 100) : 0,
                // We will calculate the complex rating (Excellent/Good/etc) on the frontend for flexibility
            })),
            risks: {
                delayed_tasks_count: taskStats[0].overdue_tasks,
                over_budget_projects_count: overBudgetProjects,
                stuck_approvals: stuckApprovals,
                zero_progress_phases: zeroProgressPhases
            },
            auditLog: {
                ...auditSummary[0],
                last_admin_action: lastActions[0].last_admin_action || null,
                last_employee_update: lastActions[0].last_employee_update || null
            },
            milestones: {
                stats: milestoneStats,
                list: milestones.map(m => ({
                    ...m,
                    is_delayed: m.status === 'Delayed' || (m.status !== 'Completed' && new Date(m.planned_end_date) < new Date())
                })),
                achievements: milestones
                    .filter(m => m.status === 'Completed' || m.progress === 100)
                    .sort((a, b) => new Date(b.actual_completion_date || b.updated_at).getTime() - new Date(a.actual_completion_date || a.updated_at).getTime())
                    .slice(0, 5) // Top 5 recent achievements
                    .map(m => `Milestone '${m.name}' in project '${m.site_name}' successfully completed`)
            },
            topExpenseProjects: projectFinancials
                .sort((a, b) => (b.spent || 0) - (a.spent || 0))
                .slice(0, 3)
                .map(p => ({
                    name: p.name,
                    spent: p.spent || 0,
                    budget: p.allocated || 0,
                    utilization: p.allocated > 0 ? Math.round(((p.spent || 0) / p.allocated) * 100) : 0
                })),
            actionItems: [
                ...stuckApprovals.map(t => `Task '${t.name}' in '${t.project_name}' waiting for approval > 3 days`),
                taskStats[0].waiting_approval > 0 ? `${taskStats[0].waiting_approval} tasks waiting for approval` : null,
                milestoneStats.delayed > 0 ? `${milestoneStats.delayed} milestones are currently delayed` : null,
                overBudgetProjects > 0 ? `${overBudgetProjects} projects have exceeded their budget` : null,
                zeroProgressPhases.length > 0 ? `${zeroProgressPhases.length} phases showing zero progress` : null
            ].filter(Boolean) // Filter out nulls

        };

        res.json(reportData);

    } catch (error) {
        console.error('Error generating overall report:', error);
        res.status(500).json({ message: 'Error generating overall report' });
    }
};
