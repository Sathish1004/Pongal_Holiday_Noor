const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. PROJECT METRICS
        const [projectStats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'delayed' OR status = 'pending' THEN 1 ELSE 0 END) as on_hold,
                SUM(budget) as total_budget
            FROM sites
        `);

        // 2. TASK METRICS
        const [taskStats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'waiting_for_approval' THEN 1 ELSE 0 END) as waiting_approval,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status != 'completed' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue,
                AVG(progress) as avg_progress
            FROM tasks
        `);

        // 3. EMPLOYEE METRICS
        const [employeeStats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                (SELECT COUNT(DISTINCT employee_id) FROM site_assignments) as active_assigned,
                (SELECT COUNT(DISTINCT employee_id) FROM tasks WHERE status != 'completed') as active_tasks
            FROM employees
            WHERE role != 'admin'
        `);

        // precise "Active" definition: assigned to a site OR has an active task
        // active_assigned and active_tasks might overlap, but for a simple "Active" vs "Idle"
        // Let's assume 'Active' means they are in the site_assignments table for now as a baseline
        const totalEmployees = employeeStats[0].total || 0;
        const activeEmployees = employeeStats[0].active_assigned || 0; // Using site assignment as primary 'Active' indicator
        const idleEmployees = Math.max(0, totalEmployees - activeEmployees);

        // 4. MATERIAL METRICS
        const [materialStats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received
            FROM material_requests
        `);

        // 5. FINANCIAL METRICS
        const [transactionStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as total_spent
            FROM transactions
        `);

        const totalBudget = parseFloat(projectStats[0].total_budget || 0);
        const totalSpent = parseFloat(transactionStats[0].total_spent || 0);

        // Highest Spending Project
        const [highestSpending] = await db.query(`
            SELECT s.name, SUM(t.amount) as spent
            FROM transactions t
            JOIN sites s ON t.site_id = s.id
            WHERE t.type = 'OUT'
            GROUP BY t.site_id
            ORDER BY spent DESC
            LIMIT 1
        `);

        // 6. RECENT ACTIVITY (Feed)
        // Combine Tasks (Completed), Materials (Requested), Assignment? 
        // For now, let's fetch recent tasks and materials
        const [recentTasks] = await db.query(`
            SELECT t.id, t.name as title, 'task' as type, s.name as project_name, t.updated_at as time
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            WHERE t.status = 'completed'
            ORDER BY t.updated_at DESC
            LIMIT 5
        `);

        const [recentMaterials] = await db.query(`
            SELECT m.id, m.material_name as title, 'material' as type, s.name as project_name, m.created_at as time
            FROM material_requests m
            JOIN sites s ON m.site_id = s.id
            ORDER BY m.created_at DESC
            LIMIT 5
        `);

        // Merge and sort
        const recentActivities = [...recentTasks, ...recentMaterials]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        // 7. PROJECT PROGRESS LIST (for "Projects Near Completion" etc)
        // We need to calculate progress per project. 
        // Assumption: Project Progress = Average of its task progress
        const [projectProgressList] = await db.query(`
            SELECT s.id, s.name, AVG(t.progress) as progress,
                   COUNT(CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 1 END) as overdue_tasks
            FROM sites s
            LEFT JOIN tasks t ON s.id = t.site_id
            WHERE s.status = 'active'
            GROUP BY s.id
        `);

        const projectsNearCompletion = projectProgressList.filter(p => p.progress >= 80).length;
        const projectsBehindSchedule = projectProgressList.filter(p => p.overdue_tasks > 0).length; // Simple definition

        // 8. ALERTS
        const [budgetAlerts] = await db.query(`
            SELECT p.name, p.budget, SUM(t.amount) as spent, s.name as project_name
            FROM phases p
            JOIN sites s ON p.site_id = s.id
            LEFT JOIN transactions t ON p.id = t.phase_id AND t.type = 'OUT'
            GROUP BY p.id
            HAVING spent > p.budget
        `);

        const [approvalAlerts] = await db.query(`
            SELECT COUNT(*) as count
            FROM tasks
            WHERE status = 'waiting_for_approval' 
            AND updated_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        const alerts = {
            overdueTasks: taskStats[0].overdue,
            budgetExceeded: budgetAlerts.length,
            longPendingApprovals: approvalAlerts[0].count,
            pendingMaterials: materialStats[0].pending
        };

        res.json({
            projects: {
                total: projectStats[0].total,
                active: projectStats[0].active,
                completed: projectStats[0].completed,
                onHold: projectStats[0].on_hold,
                nearCompletion: projectsNearCompletion,
                behindSchedule: projectsBehindSchedule,
                avgProgress: Math.round(taskStats[0].avg_progress || 0)
            },
            tasks: {
                total: taskStats[0].total,
                pending: taskStats[0].pending,
                waitingApproval: taskStats[0].waiting_approval,
                completed: taskStats[0].completed,
                overdue: taskStats[0].overdue
            },
            employees: {
                total: totalEmployees,
                active: activeEmployees,
                idle: idleEmployees
            },
            materials: {
                pending: materialStats[0].pending,
                approved: materialStats[0].approved,
                received: materialStats[0].received,
                approvedNotReceived: materialStats[0].approved // 'Approved' means approved but not yet marked 'Received' in the ENUM flow usually
            },
            financials: {
                totalBudget: totalBudget,
                totalSpent: totalSpent,
                remaining: totalBudget - totalSpent,
                highestSpendingProject: highestSpending[0] ? highestSpending[0].name : 'N/A'
            },
            recentActivity: recentActivities,
            alerts: alerts
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error loading dashboard stats' });
    }
};

// Get Pending Approvals (Tasks & Materials)
exports.getPendingApprovals = async (req, res) => {
    try {
        // 1. Fetch Tasks waiting for approval
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, p.name as phase_name, e.name as employee_name,
            (SELECT media_url FROM task_messages tm WHERE tm.task_id = t.id AND tm.media_url IS NOT NULL ORDER BY tm.created_at DESC LIMIT 1) as latest_image
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE LOWER(t.status) IN ('waiting approval', 'waiting_for_approval')
            ORDER BY s.name, p.order_num, t.created_at DESC
        `);

        // 2. Fetch Pending Material Requests
        const [materials] = await db.query(`
            SELECT m.*, s.name as site_name, e.name as employee_name
            FROM material_requests m
            JOIN sites s ON m.site_id = s.id
            LEFT JOIN employees e ON m.employee_id = e.id
            WHERE m.status = 'Pending'
            ORDER BY s.name, m.created_at DESC
        `);

        res.json({ tasks, materials });
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ message: 'Error fetching pending approvals' });
    }
};


// Get Completed Tasks Stats (Filtered by time)
exports.getCompletedTasksStats = async (req, res) => {
    try {
        const { filter } = req.query; // 'day', 'week', 'month'
        let dateCondition = "";

        if (filter === 'day') {
            dateCondition = "AND DATE(t.completed_at) = CURDATE()";
        } else if (filter === 'week') {
            dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        } else if (filter === 'month') {
            dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
        } else if (filter === 'year') {
            dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
        }
        // Default (or 'all') implies no extra date condition beyond status='completed'

        const [result] = await db.query(`
            SELECT COUNT(*) as count
            FROM tasks t
            WHERE t.status = 'completed' ${dateCondition}
        `);

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching completed tasks stats:', error);
        res.status(500).json({ message: 'Error fetching completed tasks stats' });
    }
};

// Get Completed Tasks List (Filtered)
exports.getCompletedTasks = async (req, res) => {
    try {
        const { filter, siteId, date, fromDate, toDate } = req.query; // 'day', 'week', 'month', 'year'
        let dateCondition = "";
        let queryParams = [];

        if (fromDate && toDate) {
            // Range filter (Inclusive)
            dateCondition = "AND DATE(t.completed_at) BETWEEN ? AND ?";
            queryParams.push(fromDate, toDate);
        } else if (date) {
            // Exact date filter
            dateCondition = "AND DATE(t.completed_at) = ?";
            queryParams.push(date);
        } else {
            // Relative time filter
            if (filter === 'day') {
                dateCondition = "AND DATE(t.completed_at) = CURDATE()";
            } else if (filter === 'week') {
                dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
            } else if (filter === 'month') {
                dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
            } else if (filter === 'year') {
                dateCondition = "AND t.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
            }
        }

        let siteCondition = "";
        if (siteId && siteId !== 'all') {
            siteCondition = "AND t.site_id = ?";
            queryParams.push(siteId);
        }

        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, p.name as phase_name, e.name as employee_name,
             (SELECT media_url FROM task_messages tm WHERE tm.task_id = t.id AND tm.media_url IS NOT NULL ORDER BY tm.created_at DESC LIMIT 1) as latest_image
            FROM tasks t
            JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE t.status = 'completed' ${dateCondition} ${siteCondition}
            ORDER BY s.name, p.order_num, t.completed_at DESC
        `, queryParams);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching completed tasks list:', error);
        res.status(500).json({ message: 'Error fetching completed tasks list' });
    }
};

