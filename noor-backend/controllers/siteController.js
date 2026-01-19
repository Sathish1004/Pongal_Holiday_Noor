// Site Controller - Enhanced with Phases
const db = require('../config/db');
const bcrypt = require('bcrypt'); // Added for password hashing

const { checkAndCompleteMilestones } = require('../utils/milestoneHelper');

// Helper to Create Notification
const createNotification = async (projectId, phaseId, taskId, employeeId, type, message) => {
    try {
        console.log(`Creating notification: ${type} - ${message}`);
        await db.query(`
            INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
        `, [projectId, phaseId || null, taskId || null, employeeId, type, message]);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Default construction phases
const DEFAULT_PHASES = [
    { name: 'Planning & Site Preparation', order_num: 1 },
    { name: 'Foundation', order_num: 2 },
    { name: 'Structure', order_num: 3 },
    { name: 'Finishing', order_num: 4 }
];

// Helper to ensure YYYY-MM-DD format for MySQL
const ensureIsoDate = (dateStr) => {
    if (!dateStr || dateStr === 'null' || dateStr === '') return null;
    // If it's already in YYYY-MM-DD format, return it
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
    // If it's in DD/MM/YYYY format, convert it
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return dateStr;
};

// Helper: Get Assignments for a Task
// Returns array of employee objects
const getTaskAssignments = async (taskId) => {
    const [assignments] = await db.query(`
        SELECT e.id, e.name, e.email, e.role
        FROM task_assignments ta
        JOIN employees e ON ta.employee_id = e.id
        WHERE ta.task_id = ?
    `, [taskId]);
    return assignments;
};

// Get all sites with phases (Admin)
exports.getAllSites = async (req, res) => {
    try {
        const [sites] = await db.query(`
            SELECT s.*, 
                   (SELECT COUNT(*) FROM phases WHERE site_id = s.id) as phase_count,
                   (SELECT COUNT(*) FROM tasks WHERE site_id = s.id) as task_count,
                   (
                       (SELECT COUNT(*) FROM tasks WHERE site_id = s.id AND (LOWER(status) = 'waiting approval' OR LOWER(status) = 'waiting_for_approval')) +
                       (SELECT COUNT(*) FROM material_requests WHERE site_id = s.id AND status = 'Pending')
                   ) as pending_approvals_count
            FROM sites s
            ORDER BY s.created_at DESC
        `);
        res.json({ sites });
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ message: 'Error fetching sites' });
    }
};

// Create new site with default phases and template tasks (Admin)
exports.createSite = async (req, res) => {
    try {
        const {
            name, location, startDate, endDate, duration,
            budget, site_funds, clientName, clientEmail, clientPhone,
            clientCompany, city, state, country,
            assignedEmployees
        } = req.body;

        // Insert site
        const isoStartDate = ensureIsoDate(startDate);
        const isoEndDate = ensureIsoDate(endDate);

        const [result] = await db.query(
            `INSERT INTO sites (
                name, location, start_date, end_date, duration, 
                budget, site_funds, client_name, client_email, client_phone, 
                client_company, city, state, country
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, location, isoStartDate, isoEndDate, duration || null,
                budget || 0, site_funds || 0, clientName || null, clientEmail || null, clientPhone || null,
                clientCompany || null, city || null, state || null, country || null
            ]
        );

        const siteId = result.insertId;

        // Load the comprehensive construction template
        const CONSTRUCTION_TEMPLATE = require('../templates/construction-template');

        // Create phases and tasks from template
        for (const phaseTemplate of CONSTRUCTION_TEMPLATE) {
            // Create the phase (construction stage)
            const [phaseResult] = await db.query(
                `INSERT INTO phases (
                    site_id, name, order_num, budget, 
                    floor_number, floor_name
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    siteId,
                    phaseTemplate.stageName,
                    phaseTemplate.serialNumber,
                    0, // Default budget
                    phaseTemplate.floorNumber,
                    phaseTemplate.floorName
                ]
            );

            const phaseId = phaseResult.insertId;

            // Create all tasks for this phase
            let taskOrder = 1;
            for (const taskName of phaseTemplate.tasks) {
                await db.query(
                    `INSERT INTO tasks (site_id, phase_id, name, status, order_index) 
                     VALUES (?, ?, ?, 'Not Started', ?)`,
                    [siteId, phaseId, taskName, taskOrder++]
                );
            }
        }

        // Assign employees to site
        if (assignedEmployees && assignedEmployees.length > 0) {
            const assignments = assignedEmployees.map(empId => [siteId, empId]);
            await db.query('INSERT INTO site_assignments (site_id, employee_id) VALUES ?', [assignments]);
        }

        res.status(201).json({
            message: 'Project created with complete construction workflow',
            site: {
                id: siteId, name, location, startDate, endDate, budget,
                clientName, clientEmail, clientPhone, status: 'active'
            }
        });
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ message: 'Error creating site' });
    }
};


// Get site with phases (Admin)
exports.getSiteWithPhases = async (req, res) => {
    try {
        const { id } = req.params;

        const [sites] = await db.query('SELECT * FROM sites WHERE id = ?', [id]);
        if (sites.length === 0) {
            return res.status(404).json({ message: 'Site not found' });
        }

        const [phases] = await db.query(`
            SELECT p.*, e.name as assigned_employee_name,
                   COALESCE((SELECT SUM(amount) FROM transactions WHERE phase_id = p.id AND type = 'OUT'), 0) as used_amount
            FROM phases p
            LEFT JOIN employees e ON p.assigned_to = e.id
            WHERE p.site_id = ?
            ORDER BY p.floor_number ASC, p.order_num ASC
        `, [id]);

        const [tasks] = await db.query(`
            SELECT t.*, 
                   e.name as employee_name, 
                   p.name as phase_name,
                   (
                       SELECT JSON_ARRAYAGG(
                           JSON_OBJECT(
                               'id', emp.id, 
                               'name', emp.name, 
                               'role', emp.role
                           )
                       )
                       FROM task_assignments ta
                       JOIN employees emp ON ta.employee_id = emp.id
                       WHERE ta.task_id = t.id
                   ) as assignments
            FROM tasks t
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE t.site_id = ?
            ORDER BY t.order_index ASC, t.created_at ASC
        `, [id]);

        res.json({ site: sites[0], phases, tasks });
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({ message: 'Error fetching site' });
    }
};

// Get phases for a site
exports.getPhases = async (req, res) => {
    try {
        const { siteId } = req.params;
        const [phases] = await db.query(`
            SELECT p.*,
                   COALESCE((SELECT SUM(amount) FROM transactions WHERE phase_id = p.id AND TYPE = 'OUT'), 0) as used_amount
            FROM phases p
            WHERE p.site_id = ?
            ORDER BY p.floor_number ASC, p.order_num ASC
        `, [siteId]);
        res.json({ phases });
    } catch (error) {
        console.error('Error fetching phases:', error);
        res.status(500).json({ message: 'Error fetching phases' });
    }
};

// Helper to re-index all phases for a site to be strictly sequential
const reindexPhases = async (siteId) => {
    // Keep internal order_num consistent
    const [phases] = await db.query(
        'SELECT id FROM phases WHERE site_id = ? ORDER BY order_num ASC',
        [siteId]
    );

    for (let i = 0; i < phases.length; i++) {
        await db.query('UPDATE phases SET order_num = ? WHERE id = ?', [i + 1, phases[i].id]);
    }
};

// Add custom phase with insertion logic
exports.addPhase = async (req, res) => {
    try {
        const { siteId, name, orderNum, budget, floorNumber, floorName, serialNumber } = req.body;
        // Frontend sends serialNumber as the intended order.
        const sNumber = parseInt(serialNumber) || parseInt(orderNum);

        if (!sNumber) {
            return res.status(400).json({ message: 'Serial Number is required' });
        }

        const fNumber = parseInt(floorNumber) || 0;
        const fName = floorName || "Ground Floor";

        // Check for duplicate order number (serial number in UI)
        const [existing] = await db.query('SELECT id FROM phases WHERE site_id = ? AND order_num = ?', [siteId, sNumber]);

        if (existing.length > 0) {
            // INSERTION LOGIC: Shift existing phases down
            console.log(`[addPhase] Order number ${sNumber} exists. Shifting subsequent phases...`);

            // Shift all phases with order_num >= sNumber by +1
            await db.query(
                'UPDATE phases SET order_num = order_num + 1 WHERE site_id = ? AND order_num >= ?',
                [siteId, sNumber]
            );
        }

        // Insert new phase
        await db.query(
            'INSERT INTO phases (site_id, name, order_num, budget, floor_number, floor_name) VALUES (?, ?, ?, ?, ?, ?)',
            [siteId, name, sNumber, budget || 0, fNumber, fName]
        );

        // Re-index internal order just to keep it clean
        await reindexPhases(siteId);

        res.status(201).json({ message: 'Stage added successfully' });
    } catch (error) {
        console.error('Error adding phase:', error);
        res.status(500).json({ message: 'Error adding phase' });
    }
};

// Update Phase
// Update Phase
exports.updatePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, order_num, budget } = req.body;

        // Note: serialNumber, floorNumber, floorName are not currently in the schema
        // and support for them was partial. We are sticking to the core columns.

        await db.query(
            'UPDATE phases SET name = ?, order_num = ?, budget = ? WHERE id = ?',
            [name, order_num, budget || 0, id]
        );

        res.json({ message: 'Phase updated successfully' });
    } catch (error) {
        console.error('Error updating phase:', error);
        res.status(500).json({ message: 'Error updating phase' });
    }
};

// Delete phase with re-indexing
exports.deletePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can delete phases' });
        }

        // Get site_id before deletion for re-indexing
        const [phase] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
        if (phase.length === 0) {
            return res.status(404).json({ message: 'Phase not found' });
        }
        const siteId = phase[0].site_id;

        // 1. Delete tasks in this phase
        await db.query('DELETE FROM tasks WHERE phase_id = ?', [id]);

        // 2. Delete the phase itself
        await db.query('DELETE FROM phases WHERE id = ?', [id]);

        // 3. Re-index remaining phases
        await reindexPhases(siteId);

        res.json({ message: 'Phase deleted and timeline re-indexed' });
    } catch (error) {
        console.error('Error deleting phase:', error);
        res.status(500).json({ message: 'Error deleting phase' });
    }
};

// Get assigned sites (Employee)
exports.getAssignedSites = async (req, res) => {
    try {
        const employeeId = req.user.id;
        console.log('[getAssignedSites] Fetching for employee:', employeeId);

        const [sites] = await db.query(`
            SELECT DISTINCT s.*, 
                   (
                       SELECT COUNT(DISTINCT t_in.id)
                       FROM tasks t_in
                       JOIN phases p_in ON t_in.phase_id = p_in.id
                       LEFT JOIN task_assignments ta_in ON t_in.id = ta_in.task_id
                       WHERE p_in.site_id = s.id AND (ta_in.employee_id = ? OR t_in.assigned_to = ?)
                   ) as my_tasks
            FROM sites s
            LEFT JOIN site_assignments sa ON s.id = sa.site_id
            LEFT JOIN phases p ON s.id = p.site_id
            LEFT JOIN tasks t ON p.id = t.phase_id
            LEFT JOIN task_assignments ta ON t.id = ta.task_id
            WHERE 
                sa.employee_id = ?
                OR p.assigned_to = ?
                OR t.assigned_to = ?
                OR ta.employee_id = ?
            ORDER BY s.created_at DESC
        `, [employeeId, employeeId, employeeId, employeeId, employeeId, employeeId]);

        res.json({ sites });
    } catch (error) {
        console.error('Error fetching assigned sites:', error);
        res.status(500).json({ message: 'Error fetching assigned sites' });
    }
};

// Get all tasks (Admin)
exports.getAllTasks = async (req, res) => {
    try {
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, s.location as site_location,
                   e.name as employee_name, p.name as phase_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN employees e ON t.employee_id = e.id
            LEFT JOIN phases p ON t.phase_id = p.id
            ORDER BY t.created_at DESC
        `);
        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// Create custom task (Admin only)
exports.addTask = async (req, res) => {
    try {
        const { siteId, phaseId, name, orderIndex } = req.body;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can add tasks' });
        }

        let nextOrder;

        if (orderIndex) {
            const desiredOrder = parseInt(orderIndex);

            // Check if order index exists in this phase
            const [existing] = await db.query(
                'SELECT id FROM tasks WHERE phase_id = ? AND order_index = ?',
                [phaseId, desiredOrder]
            );

            if (existing.length > 0) {
                // Happy path: Index exists, just shift
                await db.query(
                    'UPDATE tasks SET order_index = order_index + 1 WHERE phase_id = ? AND order_index >= ?',
                    [phaseId, desiredOrder]
                );
            } else {
                // Edge case: Index doesn't exist. 
                // Could be a gap, or all indexes are 0 (broken project).
                // Let's check if we have enough tasks to look suspicious.
                const [countResult] = await db.query('SELECT COUNT(*) as count FROM tasks WHERE phase_id = ?', [phaseId]);
                const totalTasks = countResult[0].count;

                if (totalTasks >= desiredOrder) {
                    // We have tasks but the index is missing? 
                    // This implies broken ordering (e.g. all 0s). 
                    // AUTO-HEAL: Re-index everything by ID/Created to restore base order.
                    console.log(`[addTask] Detecting broken order for phase ${phaseId}. Auto-healing...`);

                    const [allTasks] = await db.query('SELECT id FROM tasks WHERE phase_id = ? ORDER BY order_index ASC, id ASC', [phaseId]);
                    for (let i = 0; i < allTasks.length; i++) {
                        await db.query('UPDATE tasks SET order_index = ? WHERE id = ?', [i + 1, allTasks[i].id]);
                    }

                    // Now shift after healing
                    await db.query(
                        'UPDATE tasks SET order_index = order_index + 1 WHERE phase_id = ? AND order_index >= ?',
                        [phaseId, desiredOrder]
                    );
                }
            }
            nextOrder = desiredOrder;
        } else {
            // Append to end
            const [maxOrder] = await db.query('SELECT MAX(order_index) as max_order FROM tasks WHERE phase_id = ?', [phaseId]);
            nextOrder = (maxOrder[0].max_order || 0) + 1;
        }

        const [result] = await db.query(
            'INSERT INTO tasks (site_id, phase_id, name, status, order_index) VALUES (?, ?, ?, "Not Started", ?)',
            [siteId, phaseId, name, nextOrder]
        );

        res.status(201).json({ message: 'Task added successfully', taskId: result.insertId });
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ message: 'Error adding task' });
    }
};


// ... (existing code)

// Update task (Admin can rename/assign, Employee updates status)
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, employeeId, startDate, dueDate, amount, status, delayReason, proofUrl, assigned_to } = req.body;

        console.log('[updateTask] Handling Assignment for Employee ID:', employeeId);
        console.log('[updateTask] Updating Task ID:', id, req.body);

        // Determine if user is Admin or Employee (Admin can change everything, Employee only status/proof)
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (isAdmin) {
            // RESTRICTION: Admin cannot directly set status to 'completed'
            // Tasks must go through approval workflow
            if (status && status.toLowerCase() === 'completed') {
                return res.status(403).json({
                    message: 'Admins cannot directly complete tasks. Use the approval endpoint instead.'
                });
            }

            await db.query(
                `UPDATE tasks SET 
                    name = ?, start_date = ?, 
                    due_date = ?, amount = ?, status = ?, 
                    delay_reason = ?, proof_url = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [name, ensureIsoDate(startDate), ensureIsoDate(dueDate),
                    amount || 0, status, delayReason || null, proofUrl || null, id]
            );

            // Handle assignments if provided
            if (assigned_to && Array.isArray(assigned_to)) {
                // Delete existing assignments
                await db.query('DELETE FROM task_assignments WHERE task_id = ?', [id]);

                // Insert new assignments
                for (const empId of assigned_to) {
                    await db.query(
                        'INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)',
                        [id, empId]
                    );
                }
            }
        } else {
            // Employee only updates status and feedback
            await db.query(
                'UPDATE tasks SET status = ?, delay_reason = ?, proof_url = ?, updated_at = NOW() WHERE id = ?',
                [status, delayReason || null, proofUrl || null, id]
            );

            // NOTIFICATION: Task Updated by Employee
            if (status && status.toLowerCase() === 'completed') {
                const [tData] = await db.query('SELECT phase_id, site_id, name FROM tasks WHERE id = ?', [id]);
                if (tData.length > 0) {
                    await createNotification(
                        tData[0].site_id,
                        tData[0].phase_id,
                        id,
                        employeeId || req.user.id, // Who did the action
                        'TASK_UPDATE',
                        `Task "${tData[0].name}" marked as completed by employee.`
                    );
                }
            }
        }

        // CHECK FOR PHASE COMPLETION (Logic replicated from taskController)
        const [taskData] = await db.query('SELECT phase_id, site_id FROM tasks WHERE id = ?', [id]);
        if (taskData.length > 0 && taskData[0].phase_id) {
            const phaseId = taskData[0].phase_id;
            const siteId = taskData[0].site_id;
            const [incompleteTasks] = await db.query(
                'SELECT id FROM tasks WHERE phase_id = ? AND status != "completed"',
                [phaseId]
            );

            if (incompleteTasks.length === 0) {
                await db.query(
                    'UPDATE phases SET status = "waiting_for_approval", progress = 100 WHERE id = ?',
                    [phaseId]
                );
                // Add system message if not already added recently? (Simplification: just add it, duplicate msgs are better than none)
                await db.query(`
                    INSERT INTO stage_messages (phase_id, sender_id, type, content)
                    VALUES (?, NULL, 'system', 'All tasks completed. Waiting for admin approval.')
                 `, [phaseId]);

                // NOTIFICATION: Stage Completed
                const [pData] = await db.query('SELECT site_id FROM phases WHERE id = ?', [phaseId]);
                if (pData.length > 0) {
                    await createNotification(
                        pData[0].site_id,
                        phaseId,
                        null,
                        req.user.id,
                        'STAGE_COMPLETED',
                        'All tasks completed in stage. Waiting for approval.'
                    );
                }
            }

            // CHECK FOR MILESTONE COMPLETION
            // We check this after any task update that might have completed the phase/task
            await checkAndCompleteMilestones(siteId);
        }

        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
};

// Delete task (Admin only)
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can delete tasks' });
        }

        await db.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
};

// Reorder tasks
exports.reorderTasks = async (req, res) => {
    try {
        const { tasks } = req.body; // Array of { id, order_index }

        // Use a transaction or batch update
        // Simple loop for now as it's usually small batch
        for (const task of tasks) {
            await db.query('UPDATE tasks SET order_index = ? WHERE id = ?', [task.order_index, task.id]);
        }

        res.json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        console.error('Error reordering tasks:', error);
        res.status(500).json({ message: 'Error reordering tasks' });
    }
};

// Toggle Task Assignment
exports.toggleTaskAssignment = async (req, res) => {
    try {
        const { id } = req.params; // taskId
        const { employeeId } = req.body;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can assign tasks' });
        }

        // Check if assignment exists
        const [existing] = await db.query(
            'SELECT id FROM task_assignments WHERE task_id = ? AND employee_id = ?',
            [id, employeeId]
        );

        let action = '';

        if (existing.length > 0) {
            // Remove assignment
            await db.query('DELETE FROM task_assignments WHERE id = ?', [existing[0].id]);
            action = 'removed';
        } else {
            // Add assignment
            await db.query(
                'INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)',
                [id, employeeId]
            );
            action = 'assigned';

            // Notification
            const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [id]);
            if (taskData.length > 0) {
                await createNotification(
                    taskData[0].site_id,
                    taskData[0].phase_id,
                    id,
                    employeeId,
                    'ASSIGNMENT',
                    `You have been assigned to task: "${taskData[0].name}"`
                );
            }
        }

        const assignments = await getTaskAssignments(id);
        res.json({ message: `Assignment ${action}`, assignments });

    } catch (error) {
        console.error('Error toggling assignment:', error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};

// Get assigned tasks (Employee) using task_assignments table
exports.getAssignedTasks = async (req, res) => {
    try {
        const employeeId = req.user.id;

        const { status } = req.query; // 'completed' or undefined (active)

        let query = `
            SELECT t.*, s.name as site_name, s.location as site_location, p.name as phase_name
            FROM tasks t
            LEFT JOIN tasks t2 ON t.id = t2.id 
            LEFT JOIN task_assignments ta ON t.id = ta.task_id
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE (ta.employee_id = ? OR p.assigned_to = ?)
        `;

        if (status === 'completed') {
            query += ` AND LOWER(t.status) = 'completed'`;
        } else {
            // Default: Show Active (Not Completed)
            // This includes: Not Started, In Progress, Waiting for Approval, Change Required
            query += ` AND (LOWER(t.status) != 'completed' OR t.status IS NULL)`;
        }

        query += ` ORDER BY t.due_date ASC, t.created_at DESC`;

        const [tasks] = await db.query(query, [employeeId, employeeId]);


        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        res.status(500).json({ message: 'Error fetching assigned tasks' });
    }
};

// Status update functionality unified into updateTask, but keeping this for compatibility if needed
exports.updateTaskStatus = async (req, res) => {
    return exports.updateTask(req, res);
};

// Get employees list
// Get employees list
exports.getEmployees = async (req, res) => {
    try {
        const [employees] = await db.query(
            "SELECT id, name, email, phone, role, status, created_at, profile_image FROM employees ORDER BY created_at DESC"
        );
        res.json({ employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Error fetching employees' });
    }
};

// Create Employee
// Create Employee
exports.createEmployee = async (req, res) => {
    try {
        console.log('[createEmployee] Body:', req.body);
        const { name, email, password, phone, role, status } = req.body;

        // Validation - Phone is mandatory, Email is optional
        if (!name || !phone || !password || !role) {
            console.log('[createEmployee] Missing fields:', { name, phone, hasPassword: !!password, role });
            const missing = [];
            if (!name) missing.push('Name');
            if (!phone) missing.push('Phone');
            if (!password) missing.push('Password');
            if (!role) missing.push('Role');
            return res.status(400).json({ message: `Required fields missing: ${missing.join(', ')}` });
        }

        // Check duplicate phone
        const [phoneCheck] = await db.query('SELECT id FROM employees WHERE phone = ?', [phone]);
        if (phoneCheck.length > 0) {
            console.log('[createEmployee] Duplicate phone:', phone);
            return res.status(400).json({ message: 'Employee with this phone already exists' });
        }

        // Check duplicate email (only if provided)
        if (email) {
            const [emailCheck] = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Employee with this email already exists' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        await db.query(
            'INSERT INTO employees (name, email, phone, password, role, status, password_updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [name, email || null, phone, hashedPassword, role.toLowerCase(), status || 'Active']
        );

        res.status(201).json({ message: 'Employee created successfully' });

    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Error creating employee' });
    }
};

// Update Employee
// Update Employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone, role, status } = req.body;

        if (!name || !phone || !role) {
            return res.status(400).json({ message: 'Name, Phone, and Role are required' });
        }

        // Check uniqueness for phone (excluding self)
        const [phoneCheck] = await db.query('SELECT id FROM employees WHERE phone = ? AND id != ?', [phone, id]);
        if (phoneCheck.length > 0) {
            return res.status(400).json({ message: 'Phone number already in use by another employee' });
        }

        // Check uniqueness for email (if provided, excluding self)
        if (email) {
            const [emailCheck] = await db.query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
            if (emailCheck.length > 0) {
                return res.status(400).json({ message: 'Email already in use by another employee' });
            }
        }

        let query = 'UPDATE employees SET name = ?, email = ?, phone = ?, role = ?, status = ?';
        let params = [name, email || null, phone, role, status || 'Active'];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?, password_updated_at = NOW()';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);

        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Error updating employee' });
    }
};

// Complete a phase (Employee)
exports.completePhase = async (req, res) => {
    try {
        const { id } = req.params; // phaseId
        const employeeId = req.user.id;

        // Verify assignment
        const [phase] = await db.query('SELECT * FROM phases WHERE id = ?', [id]);
        if (phase.length === 0) return res.status(404).json({ message: 'Phase not found' });

        if (phase[0].assigned_to !== employeeId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to complete this phase' });
        }

        // Update status and completed_by
        await db.query(
            'UPDATE phases SET status = "Completed", completed_by = ?, completed_at = NOW() WHERE id = ?',
            [employeeId, id]
        );

        res.json({ message: 'Phase marked as completed' });
    } catch (error) {
        console.error('Error completing phase:', error);
        res.status(500).json({ message: 'Error completing phase' });
    }
};

// Assign employee to phase
// Assign employee to phase
exports.assignEmployeeToPhase = async (req, res) => {
    try {
        const { id } = req.params; // phaseId
        const { employeeId } = req.body;

        // 1. Assign to Phase
        await db.query('UPDATE phases SET assigned_to = ? WHERE id = ?', [employeeId, id]);

        // 2. Cascade assign to all Tasks in this Phase
        await db.query('UPDATE tasks SET employee_id = ? WHERE phase_id = ?', [employeeId, id]);

        // 3. Create Notification for the Employee
        try {
            // Get Phase and Project Names
            const [phaseRows] = await db.query(`
                SELECT p.name as phase_name, s.id as project_id, s.name as project_name 
                FROM phases p 
                JOIN sites s ON p.site_id = s.id 
                WHERE p.id = ?
            `, [id]);

            if (phaseRows.length > 0) {
                const { phase_name, project_id, project_name } = phaseRows[0];
                const notifMessage = `You have been assigned to stage: ${phase_name} in project: ${project_name}`;

                // Use 'ASSIGNMENT' type, and employeeId as the recipient (associated employee)
                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, employee_id, type, message, is_read, created_at)
                    VALUES (?, ?, ?, 'ASSIGNMENT', ?, 0, NOW())
                `, [project_id, id, employeeId, notifMessage]);
            }
        } catch (notifError) {
            console.error('Error creating assignment notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.json({ message: 'Employee assigned successfully to phase and its tasks' });
    } catch (error) {
        console.error('Error assigning employee:', error);
        res.status(500).json({ message: 'Error assigning employee' });
    }
};

// Delete Employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for assignments
        const [tasks] = await db.query('SELECT id FROM tasks WHERE employee_id = ?', [id]);
        if (tasks.length > 0) {
            // Nullify assignments instead of blocking? Or block?
            // Let's unassign tasks first
            await db.query('UPDATE tasks SET employee_id = NULL WHERE employee_id = ?', [id]);
        }

        // Also unassign from phases (Crucial fix)
        await db.query('UPDATE phases SET assigned_to = NULL WHERE assigned_to = ?', [id]);

        await db.query('DELETE FROM site_assignments WHERE employee_id = ?', [id]);
        await db.query('DELETE FROM employees WHERE id = ?', [id]);

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee' });
    }
};

// Update site (Admin)
exports.updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, location, startDate, endDate, duration,
            budget, site_funds, clientName, clientEmail, clientPhone,
            clientCompany, city, state, country,
            phaseUpdates
        } = req.body;

        const isoStartDate = ensureIsoDate(startDate);
        const isoEndDate = ensureIsoDate(endDate);

        await db.query(
            `UPDATE sites SET 
                name = ?, location = ?, start_date = ?, end_date = ?, duration = ?, 
                budget = ?, site_funds = ?, client_name = ?, client_email = ?, client_phone = ?,
                client_company = ?, city = ?, state = ?, country = ?,
                updated_at = NOW() 
            WHERE id = ?`,
            [
                name, location, isoStartDate, isoEndDate, duration || null,
                budget || 0, site_funds || 0, clientName || null, clientEmail || null, clientPhone || null,
                clientCompany || null, city || null, state || null, country || null,
                id
            ]
        );

        // Bulk update phase budgets if provided
        if (phaseUpdates && Array.isArray(phaseUpdates)) {
            for (const p of phaseUpdates) {
                if (p.id) {
                    await db.query('UPDATE phases SET budget = ? WHERE id = ? AND site_id = ?', [p.budget || 0, p.id, id]);
                }
            }
        }

        res.json({ message: 'Site and stages updated successfully' });
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ message: 'Error updating site' });
    }
};

// Delete Site
exports.deleteSite = async (req, res) => {
    try {
        const { id } = req.params;

        // Explicitly delete related data to ensure no FK constraints block us
        // 1. Delete tasks
        await db.query('DELETE FROM tasks WHERE site_id = ?', [id]);

        // 2. Delete phases
        await db.query('DELETE FROM phases WHERE site_id = ?', [id]);

        // 3. Delete assignments
        await db.query('DELETE FROM site_assignments WHERE site_id = ?', [id]);

        // 4. Delete the site itself
        const [result] = await db.query('DELETE FROM sites WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Site not found' });
        }

        console.log(`Site ${id} and associated data deleted successfully`);
        res.json({ message: 'Site deleted successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error deleting site',
            error: error.message
        });
    }
};

// --- Employee Dashboard APIs ---

// Get Employee Dashboard Stats
exports.getEmployeeDashboardStats = async (req, res) => {
    try {
        const employeeId = req.user.id;

        // Count phases/stages assigned
        // status can be 'Completed' OR 'waiting_for_approval' to count as completed for the employee
        const [phaseStats] = await db.query(`
            SELECT 
                COUNT(*) as total_phases,
                COALESCE(SUM(CASE WHEN status IN ('Completed', 'waiting_for_approval') THEN 1 ELSE 0 END), 0) as completed_phases,
                COALESCE(SUM(CASE WHEN status NOT IN ('Completed', 'waiting_for_approval') THEN 1 ELSE 0 END), 0) as pending_phases
            FROM phases
            WHERE assigned_to = ?
        `, [employeeId]);

        // Count tasks assigned
        // status can be 'Completed' OR 'Completed – Waiting for Admin Approval' OR 'waiting_for_approval'
        const [taskStats] = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                COALESCE(SUM(CASE 
                    WHEN LOWER(t.status) = 'completed' 
                    THEN 1 ELSE 0 END), 0) as completed_tasks,
                COALESCE(SUM(CASE 
                    WHEN LOWER(t.status) != 'completed' 
                    THEN 1 ELSE 0 END), 0) as pending_tasks
            FROM tasks t
            WHERE t.employee_id = ? 
               OR t.id IN (SELECT task_id FROM task_assignments WHERE employee_id = ?)
        `, [employeeId, employeeId]);

        // Combine phase and task counts (convert to numbers to avoid string concatenation)
        const totalPending = Number(phaseStats[0].pending_phases || 0) + Number(taskStats[0].pending_tasks || 0);
        const totalCompleted = Number(phaseStats[0].completed_phases || 0) + Number(taskStats[0].completed_tasks || 0);

        console.log('[Dashboard Stats] Updated:', {
            employeeId,
            phaseStats: phaseStats[0],
            taskStats: taskStats[0],
            totalPending,
            totalCompleted
        });

        res.json({
            pending: totalPending,
            completed: totalCompleted
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// Get Employee Tasks (with filters)
exports.getEmployeeTasks = async (req, res) => {
    try {
        const employeeId = req.user.id;
        // Simple fetch for now, can add status filter from query if needed
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, s.location as site_location, p.name as phase_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            WHERE t.employee_id = ?
            ORDER BY t.created_at DESC
        `, [employeeId]);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching employee tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

// Get Employee Assigned Phases (Stages)
exports.getEmployeePhases = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const [phases] = await db.query(`
            SELECT p.*, s.name as site_name, s.location as site_location, s.created_at as site_created_at,
            MIN(t.start_date) as min_task_start, 
            MAX(t.due_date) as max_task_due
            FROM phases p
            JOIN tasks t ON p.id = t.phase_id
            JOIN task_assignments ta ON t.id = ta.task_id
            LEFT JOIN sites s ON p.site_id = s.id
            WHERE ta.employee_id = ?
            GROUP BY p.id
            ORDER BY s.created_at DESC, p.order_num ASC
        `, [employeeId]);

        // Post-processing to fill missing dates
        phases.forEach(phase => {
            if (!phase.start_date && phase.min_task_start) phase.start_date = phase.min_task_start;
            if (!phase.due_date && phase.max_task_due) phase.due_date = phase.max_task_due;
        });

        res.json({ phases });
    } catch (error) {
        console.error('Error fetching employee phases:', error);
        res.status(500).json({ message: 'Error fetching phases' });
    }
};

// Get Full Task Details (for Split View)
exports.getTaskDetails = async (req, res) => {
    try {
        const { taskId } = req.params;
        const employeeId = req.user.id;
        const requesterRole = req.user.role;

        console.log(`[SiteController] getTaskDetails calling for taskId: ${taskId} by user: ${employeeId} (${requesterRole})`);

        // 1. Task Basic Info
        const [tasks] = await db.query(`
            SELECT t.*, s.name as site_name, p.name as phase_name, p.progress as phase_progress, e.name as assigned_employee_name
            FROM tasks t
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE t.id = ?
        `, [taskId]);

        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = tasks[0];

        // Fetch assignments for this task (Multi-assignee support)
        task.assignments = await getTaskAssignments(task.id);
        // Helper string for legacy frontend support
        task.assigned_employee_name = task.assignments.map(a => a.name).join(', ');

        // 2. Task Updates (Progress history)
        const [updates] = await db.query(`
            SELECT tu.*, e.name as employee_name
            FROM task_updates tu
            LEFT JOIN employees e ON tu.employee_id = e.id
            WHERE tu.task_id = ?
            ORDER BY tu.created_at DESC
        `, [taskId]);

        // 3. Task Messages (Chat) - optional, might be fetched separately
        const [messages] = await db.query(`
            SELECT tm.*, 
            COALESCE(e.name, CASE WHEN tm.sender_id = 1 THEN 'Admin' ELSE 'User' END) as sender_name
            FROM task_messages tm
            LEFT JOIN employees e ON tm.sender_id = e.id
            WHERE tm.task_id = ?
            ORDER BY tm.created_at ASC
        `, [taskId]);

        // 4. Todos
        const [todos] = await db.query(`
            SELECT * FROM todos WHERE task_id = ? ORDER BY created_at ASC
        `, [taskId]);

        // 5. Phase Updates
        let phaseUpdates = [];
        let stageMessages = [];
        if (task.phase_id) {
            const [pUpdates] = await db.query(`
                SELECT su.*, e.name as employee_name
                FROM stage_updates su
                LEFT JOIN employees e ON su.employee_id = e.id
                WHERE su.phase_id = ?
                ORDER BY su.created_at DESC
            `, [task.phase_id]);
            phaseUpdates = pUpdates;

            // 6. Stage Messages (Context from parent phase)
            const [pMessages] = await db.query(`
                SELECT sm.*,
                CASE 
                    WHEN sm.sender_role IN ('admin', 'Admin') THEN 'Admin'
                    ELSE COALESCE(e.name, 'User')
                END as sender_name,
                'stage_message' as source_type
                FROM stage_messages sm
                LEFT JOIN employees e ON sm.sender_id = e.id AND (sm.sender_role IS NULL OR sm.sender_role NOT IN ('admin', 'Admin'))
                WHERE sm.phase_id = ?
                ORDER BY sm.created_at ASC
            `, [task.phase_id]);
            stageMessages = pMessages;
        }

        res.json({ task, updates, messages, todos, phase_updates: phaseUpdates, stage_messages: stageMessages });

    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ message: 'Error fetching task details' });
    }
};

// --- Stage Progress Features ---

// Get all details for a specific phase (Employee & Admin)
exports.getPhaseDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Phase Info
        const [phases] = await db.query(`
            SELECT p.*, e.name as assigned_employee_name, s.name as site_name, s.location as site_location
            FROM phases p
            LEFT JOIN employees e ON p.assigned_to = e.id
            LEFT JOIN sites s ON p.site_id = s.id
            WHERE p.id = ?
        `, [id]);

        if (phases.length === 0) return res.status(404).json({ message: 'Phase not found' });
        const phase = phases[0];

        // Todos
        const [todos] = await db.query('SELECT * FROM stage_todos WHERE phase_id = ? ORDER BY created_at ASC', [id]);

        // Updates
        const [updates] = await db.query(`
            SELECT u.*, e.name as employee_name 
            FROM stage_updates u
            LEFT JOIN employees e ON u.employee_id = e.id
            WHERE u.phase_id = ?
            ORDER BY u.created_at DESC
        `, [id]);

        // Messages
        const [messages] = await db.query(`
            SELECT m.*, 
            COALESCE(e.name, CASE WHEN m.sender_id = 1 THEN 'Admin' ELSE 'User' END) as sender_name,
            COALESCE(e.role, CASE WHEN m.sender_id = 1 THEN 'Admin' ELSE 'User' END) as sender_role
            FROM stage_messages m
            LEFT JOIN employees e ON m.sender_id = e.id
            WHERE m.phase_id = ?
            ORDER BY m.created_at ASC
        `, [id]);

        // Predefined Subtasks (from tasks table) with Assignments
        const [subTasks] = await db.query(`
            SELECT t.*
            FROM tasks t
            WHERE t.phase_id = ?
            ORDER BY t.created_at ASC
        `, [id]);

        // Enrich tasks with assignments
        // Note: For 10-20 tasks, separate queries are fine given SQLite/MySQL nuances with Group Concat
        // Or we could do a JOIN and aggregate in JS. Let's do a quick enrichment loop for simplicity and robustness.
        for (const task of subTasks) {
            task.assignments = await getTaskAssignments(task.id);
            // Helper for frontend compatibility (optional, can be deprecated later)
            task.assigned_employee_name = task.assignments.map(a => a.name).join(', ');
            task.employee_id = null; // Deprecate single ID exposure to force array usage
        }

        res.json({ phase, todos, updates, messages, subTasks });

    } catch (error) {
        console.error('Error fetching phase details:', error);
        res.status(500).json({ message: 'Error fetching phase details' });
    }
};

// Add Todo to Phase
exports.addPhaseTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        await db.query('INSERT INTO stage_todos (phase_id, content) VALUES (?, ?)', [id, content]);
        res.status(201).json({ message: 'Todo added' });
    } catch (error) {
        console.error('Error adding todo:', error);
        res.status(500).json({ message: 'Error adding todo' });
    }
};

// Toggle Todo
exports.togglePhaseTodo = async (req, res) => {
    try {
        const { todoId } = req.params;
        await db.query('UPDATE stage_todos SET is_completed = NOT is_completed WHERE id = ?', [todoId]);
        res.json({ message: 'Todo updated' });
    } catch (error) {
        console.error('Error toggling todo:', error);
        res.status(500).json({ message: 'Error toggling todo' });
    }
};

// Add Progress Update
exports.addPhaseUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeId = req.user.id;
        const { progress, message, newStatus } = req.body;

        // Get previous progress
        const [rows] = await db.query('SELECT progress FROM phases WHERE id = ?', [id]);
        const prevProgress = rows[0]?.progress || 0;

        // Insert update
        await db.query(`
            INSERT INTO stage_updates (phase_id, employee_id, previous_progress, new_progress, message, status)
            VALUES (?, ?, ?, ?, ?, 'Approved')
        `, [id, employeeId, prevProgress, progress, message]);

        // NOTIFICATION: Progress Update
        const [phData] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
        if (phData.length > 0) {
            await createNotification(
                phData[0].site_id,
                id,
                null,
                employeeId,
                'TASK_UPDATE', // Using TASK_UPDATE for general progress updates too
                `Progress updated to ${progress}%: ${message}`
            );
        }

        // Update phase logic
        let status = 'in_progress';
        // Check if this is a submission for approval (either 100% or explicit submission message)
        if (Number(progress) === 100 || (message && message.toLowerCase().includes('submitted for approval'))) {
            status = 'waiting_for_approval';
        } else if (Number(progress) === 0) {
            status = 'Not Started';
        }

        await db.query('UPDATE phases SET progress = ?, status = ? WHERE id = ?', [progress, status, id]);

        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error('Error adding update:', error);
        res.status(500).json({ message: 'Error adding update' });
    }
};

// Approve Phase (Admin)
exports.approvePhase = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can approve phases' });
        }

        await db.query(
            'UPDATE phases SET status = "Completed", approved_by = ?, approved_at = NOW() WHERE id = ?',
            [req.user.id, id]
        );

        // Add system message
        await db.query(`
            INSERT INTO stage_messages (phase_id, sender_id, type, content)
            VALUES (?, ?, 'system', '✅ Good work! Phase approved and completed by admin.')
        `, [id, req.user.id]);

        res.json({ message: 'Phase approved and completed' });
    } catch (error) {
        console.error('Error approving phase:', error);
        res.status(500).json({ message: 'Error approving phase' });
    }
};

// Reject Phase (Admin - Request Changes)
exports.rejectPhase = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can reject phases' });
        }

        await db.query(
            'UPDATE phases SET status = "in_progress", progress = 0 WHERE id = ?',
            [id]
        );

        // Add system message
        await db.query(`
            INSERT INTO stage_messages (phase_id, sender_id, type, content)
            VALUES (?, ?, 'system', ?)
        `, [id, req.user.id, `Admin requested changes: ${reason || 'Please review and resubmit'}`]);

        res.json({ message: 'Phase sent back for revisions' });
    } catch (error) {
        console.error('Error rejecting phase:', error);
        res.status(500).json({ message: 'Error rejecting phase' });
    }
};

// Send Message
exports.sendPhaseMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const senderId = req.user.id;
        const { type, content, mediaUrl } = req.body;
        const senderRole = req.user.role; // 'admin', 'employee', etc.

        await db.query(`
            INSERT INTO stage_messages (phase_id, sender_id, sender_role, type, content, media_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, senderId, senderRole, type || 'text', content, mediaUrl]);

        // NOTIFICATION: Chat Message
        // Only notify if sender is NOT admin (assuming Admin doesn't need to notify themselves, but requirement says "Employee... must notify Admin")
        // We'll check role if needed, but safe to just create it, and frontend filters "my own" notifications if needed.
        // Actually req says "Employee updates... must notify Admin". 
        // If sender is admin, we probably shouldn't create a notification for the admin.
        if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
            const [phData2] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
            if (phData2.length > 0) {
                await createNotification(
                    phData2[0].site_id,
                    id,
                    null,
                    senderId,
                    'CHAT_UPDATE',
                    `New message: ${content ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : 'Media attachment'}`
                );
            }
        }

        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
};

// Get Notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
        const isEmployee = !isAdmin; // Assuming any non-admin is employee

        let query = `
            SELECT n.*, s.name as project_name, p.name as phase_name, e.name as employee_name
            FROM notifications n
            LEFT JOIN sites s ON n.project_id = s.id
            LEFT JOIN phases p ON n.phase_id = p.id
            LEFT JOIN employees e ON n.employee_id = e.id
        `;

        let params = [];

        if (isAdmin) {
            // Admin sees Task Updates, Chat Updates, Stage Completions, and Submissions/Requests
            // Removed MATERIAL_UPDATE as that is for Employee (Approval status)
            query += ` WHERE n.type IN ('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED', 'TASK_SUBMITTED', 'MATERIAL_REQUEST', 'MATERIAL_RECEIVED')`;
        } else {
            // Employee sees Assignments where they are the 'employee_id' (Recipient override)
            query += ` WHERE n.employee_id = ? AND n.type IN ('ASSIGNMENT', 'TASK_APPROVED', 'TASK_REJECTED', 'MATERIAL_UPDATE')`;
            params.push(userId);
        }

        query += ` ORDER BY n.is_read ASC, n.created_at DESC LIMIT 50`;

        const [notifications] = await db.query(query, params);

        // Count unread
        let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0';
        let countParams = [];

        if (isAdmin) {
            countQuery += ` AND type IN ('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED', 'TASK_SUBMITTED', 'MATERIAL_REQUEST', 'MATERIAL_RECEIVED')`;
        } else {
            countQuery += ` AND employee_id = ? AND type IN ('ASSIGNMENT', 'TASK_APPROVED', 'TASK_REJECTED', 'MATERIAL_UPDATE')`;
            countParams.push(userId);

        }

        const [countRow] = await db.query(countQuery, countParams);
        const unreadCount = countRow[0].count;

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark Notification Read
exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ message: 'Error marking notification read' });
    }
};

// Get Phase Details (Tasks, Updates, Messages, Todos)
exports.getPhaseDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        // 1. Get Phase Info
        const [phases] = await db.query(
            "SELECT p.*, s.name as site_name FROM phases p JOIN sites s ON p.site_id = s.id WHERE p.id = ?",
            [id]
        );

        if (phases.length === 0) return res.status(404).json({ message: 'Phase not found' });
        const phase = phases[0];

        // 2. Get Tasks (Sub-tasks)
        // Only fetch tasks for this phase
        const [tasks] = await db.query(`
            SELECT t.*,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', e.id, 'name', e.name))
             FROM task_assignments ta
             JOIN employees e ON ta.employee_id = e.id
             WHERE ta.task_id = t.id) as assignments
            FROM tasks t
            WHERE t.phase_id = ?
            ORDER BY t.created_at ASC
        `, [id]);

        // 3. Get Stage Updates
        const [updates] = await db.query(
            "SELECT * FROM stage_updates WHERE phase_id = ? ORDER BY created_at DESC",
            [id]
        );

        // 4. Get Stage Messages
        // We need to fetch sender name. Sender can be in 'users' (Admin) or 'employees'.
        // We'll perform a UNION or left join on both if needed, but simpler:
        // Assume 'users' table works if you sync employee logins to users table or just LEFT JOIN both.
        // For now, let's try a simple Left Join on users, and if null, maybe it is an employee?
        // Actually, we don't need complex join if we just store sender_name in message OR fetching it dynamically.
        // Let's use a subquery for name.
        const [messages] = await db.query(`
            SELECT sm.*,
            CASE 
                WHEN sm.sender_role IN ('admin', 'Admin') THEN 'Admin'
                ELSE COALESCE(e.name, 'User')
            END as sender_name,
            COALESCE(sm.sender_role, e.role, 'User') as resolved_role
            FROM stage_messages sm
            LEFT JOIN employees e ON sm.sender_id = e.id AND (sm.sender_role IS NULL OR sm.sender_role NOT IN ('admin', 'Admin'))
            WHERE sm.phase_id = ?
            ORDER BY sm.created_at ASC
        `, [id]);

        // 5. Get Stage Todos
        const [todos] = await db.query(
            "SELECT * FROM stage_todos WHERE phase_id = ? ORDER BY created_at DESC",
            [id]
        );

        res.json({
            phase,
            tasks,
            updates,
            messages,
            todos
        });

    } catch (error) {
        console.error('Error fetching phase details:', error);
        res.status(500).json({ message: 'Error fetching details' });
    }
};

// Add Phase Update
exports.addPhaseUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, progress, previous_progress } = req.body;
        const employeeId = req.user.id;

        // Only add update record if it's not a completion (progress 100) or if there is a specific message
        if (Number(progress) !== 100 || (message && message.trim() !== '')) {
            await db.query(
                "INSERT INTO stage_updates (phase_id, employee_id, message, previous_progress, new_progress) VALUES (?, ?, ?, ?, ?)",
                [id, employeeId, message || 'Progress Update', previous_progress || 0, progress]
            );
        }

        // Update Phase Progress and Status
        let status = 'in_progress';

        // Check if this is a submission for approval or 100% completion
        if (Number(progress) === 100) {
            status = 'waiting_for_approval';
        } else if (Number(progress) === 0) {
            status = 'Not Started';
        } else if (message && message.toLowerCase().includes('submitted for approval')) {
            status = 'waiting_for_approval';
        }

        await db.query("UPDATE phases SET progress = ?, status = ? WHERE id = ?", [progress, status, id]);

        // NOTIFICATION: Task/Stage Update
        if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
            const [phData] = await db.query('SELECT site_id FROM phases WHERE id = ?', [id]);
            if (phData.length > 0) {
                await createNotification(
                    phData[0].site_id,
                    id,
                    null, // task_id null for stage update
                    employeeId,
                    'TASK_UPDATE', // Reusing type
                    `Stage updated: ${progress}% - ${message}`
                );
            }
        }

        res.json({ message: 'Update added' });
    } catch (error) {
        console.error('Error adding phase update:', error);
        res.status(500).json({ message: 'Error adding update' });
    }
};

// Add Phase Todo
exports.addPhaseTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        await db.query("INSERT INTO stage_todos (phase_id, content) VALUES (?, ?)", [id, content]);
        res.json({ message: 'Todo added' });
    } catch (error) {
        console.error('Error adding todo:', error);
        res.status(500).json({ message: 'Error adding todo' });
    }
};

// Toggle Phase Todo
exports.togglePhaseTodo = async (req, res) => {
    try {
        const { todoId } = req.params;
        const [rows] = await db.query("SELECT is_completed FROM stage_todos WHERE id = ?", [todoId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Todo not found' });

        const newState = !rows[0].is_completed;
        await db.query("UPDATE stage_todos SET is_completed = ? WHERE id = ?", [newState, todoId]);

        res.json({ message: 'Todo updated', is_completed: newState });
    } catch (error) {
        console.error('Error toggling todo:', error);
        res.status(500).json({ message: 'Error toggling todo' });
    }
};

// Get Employee Profile
exports.getEmployeeProfile = async (req, res) => {
    try {
        const employeeId = req.user.id;
        // Select all columns to ensure we get profile_image if it exists
        const [rows] = await db.query("SELECT id, name, email, phone, role, status, profile_image FROM employees WHERE id = ?", [employeeId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ user: rows[0] });
    } catch (error) {
        // If profile_image column doesn't exist, retry without it
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            const [rows] = await db.query("SELECT id, name, email, phone, role, status FROM employees WHERE id = ?", [req.user.id]);
            return res.json({ user: rows[0] });
        }
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// Update Employee Profile
exports.updateEmployeeProfile = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const { name, email, phone, password, profile_image } = req.body;

        // Build update query
        let query = "UPDATE employees SET name = ?, email = ?, phone = ?";
        let params = [name, email, phone];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ", password = ?";
            params.push(hashedPassword);
        }

        if (profile_image !== undefined) {
            query += ", profile_image = ?";
            params.push(profile_image);
        }

        query += " WHERE id = ?";
        params.push(employeeId);

        await db.query(query, params);

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        // Check if error is missing column 'profile_image'
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage.includes("Unknown column 'profile_image'")) {
            console.log("Adding missing column 'profile_image' to employees table...");
            try {
                await db.query("ALTER TABLE employees ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL");
                // Retry update (recursive call might fail due to headers sent, so just re-run logic)
                await db.query(query, params); // Re-run query
                return res.json({ message: 'Profile updated successfully (schema updated)' });
            } catch (alterError) {
                console.error("Failed to alter table:", alterError);
            }
        }

        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Get all files for a site (Admin)
exports.getSiteFiles = async (req, res) => {
    try {
        const { siteId } = req.params;
        const [files] = await db.query(`
            SELECT 
                tm.id, 
                CASE 
                    WHEN tm.media_url IS NOT NULL AND tm.media_url != '' THEN tm.media_url
                    ELSE tm.content 
                END as url,
                tm.type, 
                tm.created_at, 
                tm.task_id,
                t.name as task_name,
                p.name as phase_name,
                e.name as uploaded_by,
                tm.site_id
            FROM task_messages tm
            LEFT JOIN tasks t ON tm.task_id = t.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON tm.sender_id = e.id
            WHERE (p.site_id = ? OR tm.site_id = ?)
            AND tm.type IN ('image', 'video', 'audio', 'document', 'link')
            ORDER BY tm.created_at DESC
        `, [siteId, siteId]);

        res.json({ files });
    } catch (error) {
        console.error('Error fetching site files:', error);
        res.status(500).json({ message: 'Error fetching site files' });
    }
};

// Add File to Site (Direct Upload)
exports.addSiteFile = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { url, type } = req.body;
        const senderId = req.user ? req.user.id : null;
        const fs = require('fs');

        const logMsg = `[addSiteFile] ${new Date().toISOString()} Request: SiteID=${siteId}, URL=${url}, Type=${type}, Sender=${senderId}\n`;
        try {
            fs.appendFileSync('debug_controller.txt', logMsg);
        } catch (e) { console.error('Log error', e); }

        console.log(logMsg);

        if (!siteId || !url) {
            console.error('[addSiteFile] Missing required fields');
            return res.status(400).json({ message: 'Missing siteId or url' });
        }

        const siteIdInt = parseInt(siteId);
        if (isNaN(siteIdInt)) {
            return res.status(400).json({ message: 'Invalid Site ID' });
        }

        // Insert into task_messages with site_id, null task_id
        const [result] = await db.query(`
            INSERT INTO task_messages (site_id, task_id, sender_id, type, content, created_at)
            VALUES (?, NULL, ?, ?, ?, NOW())
        `, [siteIdInt, senderId, type, url]);

        console.log('[addSiteFile] Insert result:', result);
        try {
            fs.appendFileSync('debug_controller.txt', `[addSiteFile] Insert ID: ${result.insertId}\n`);
        } catch (e) { }

        res.status(201).json({ message: 'File added successfully', fileId: result.insertId });
    } catch (error) {
        console.error('Error adding site file:', error);
        try {
            require('fs').appendFileSync('debug_controller.txt', `[addSiteFile] Error: ${error.message}\n`);
        } catch (e) { }
        res.status(500).json({ message: 'Error adding site file' });
    }
};