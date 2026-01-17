const db = require('../config/db');

// Add Task Update (Progress)
exports.addTaskUpdate = async (req, res) => {
    try {
        const { taskId } = req.params;
        const employeeId = req.user.id;
        const { progress, note, imageUrl, audioUrl } = req.body;

        // Get previous progress and task details
        const [task] = await db.query('SELECT progress, phase_id, site_id, name FROM tasks WHERE id = ?', [taskId]);
        const previousProgress = task[0] ? task[0].progress : 0;

        // Insert update
        await db.query(`
            INSERT INTO task_updates (task_id, employee_id, previous_progress, new_progress, note, image_url, audio_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [taskId, employeeId, previousProgress, progress, note, imageUrl || null, audioUrl || null]);

        // Update task main progress
        await db.query('UPDATE tasks SET progress = ? WHERE id = ?', [progress, taskId]);

        // If progress is 100, mark as waiting_for_approval and record who completed it
        if (Number(progress) === 100) {
            await db.query(
                'UPDATE tasks SET status = "waiting_for_approval", completed_by = ?, completed_at = NOW() WHERE id = ?',
                [employeeId, taskId]
            );
        } else if (Number(progress) > 0) {
            await db.query('UPDATE tasks SET status = "in_progress" WHERE id = ?', [taskId]);
        }

        // Get task data for notifications
        const taskData = task;
        if (taskData.length > 0 && taskData[0].phase_id) {
            const { phase_id, site_id, name } = taskData[0];
            const phaseId = phase_id;

            const [incompleteTasks] = await db.query(
                'SELECT id FROM tasks WHERE phase_id = ? AND status != "completed"',
                [phaseId]
            );

            // NOTIFICATION FOR ADMIN: Task Submitted for Approval
            if (Number(progress) === 100) {
                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                    SELECT ?, ?, ?, id, 'TASK_SUBMITTED', ?, 0, NOW()
                    FROM employees WHERE role = 'Admin'
                `, [site_id, phaseId, taskId, `Task "${name}" submitted for approval.`]);

                // Add system message to task chat
                await db.query(`
                    INSERT INTO task_messages (task_id, sender_id, type, content)
                    VALUES (?, NULL, 'system', 'Task marked as completed. Waiting for admin approval.')
                `, [taskId]);
            }

            if (incompleteTasks.length === 0) {
                // All tasks completed behavior (keep existing or comment out)
            }

            // Add system message to stage chat
            await db.query(`
                    INSERT INTO stage_messages (phase_id, sender_id, type, content)
                    VALUES (?, ?, 'system', 'Task update: ' + ?)
                `, [phaseId, employeeId, progress + '% - ' + (note || 'Progress updated')]);
        }

        res.json({ message: 'Progress updated successfully' });
    } catch (error) {
        console.error('Error adding task update:', error);
        res.status(500).json({ message: 'Error adding update' });
    }
};

// Add Todo
exports.addTodo = async (req, res) => {
    try {
        const { taskId } = req.params;
        const employeeId = req.user.id;
        const { content } = req.body;

        const [result] = await db.query(`
            INSERT INTO todos (task_id, employee_id, content) VALUES (?, ?, ?)
        `, [taskId, employeeId, content]);

        res.status(201).json({
            message: 'Todo added',
            todo: { id: result.insertId, content, is_completed: 0 }
        });
    } catch (error) {
        console.error('Error adding todo:', error);
        res.status(500).json({ message: 'Error adding todo' });
    }
};

// Toggle Todo
exports.toggleTodo = async (req, res) => {
    try {
        const { todoId } = req.params;

        await db.query(`
            UPDATE todos SET is_completed = NOT is_completed WHERE id = ?
        `, [todoId]);

        res.json({ message: 'Todo updated' });
    } catch (error) {
        console.error('Error toggling todo:', error);
        res.status(500).json({ message: 'Error updating todo' });
    }
};

// Send Task Message
exports.sendTaskMessage = async (req, res) => {
    try {
        const { taskId } = req.params;
        const senderId = req.user.id;
        const { type, content, mediaUrl } = req.body;

        console.log(`[TaskController] sendTaskMessage: taskId=${taskId}, senderId=${senderId}, content=${content}`);

        await db.query(`
            INSERT INTO task_messages (task_id, sender_id, type, content, media_url)
            VALUES (?, ?, ?, ?, ?)
        `, [taskId, senderId, type || 'text', content, mediaUrl || null]);

        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
};

// Complete Task (Employee submits for approval)
exports.completeTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const employeeId = req.user.id;

        // Update task status to waiting_for_approval and set progress to 100
        console.log(`[TaskController] Completing task ${taskId} by user ${employeeId}. Sending notification...`);
        await db.query(
            'UPDATE tasks SET status = "waiting_for_approval", progress = 100, completed_by = ?, completed_at = NOW() WHERE id = ?',
            [employeeId, taskId]
        );

        // Get task details for notification
        const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);
        if (taskData.length > 0) {
            const task = taskData[0];

            // Notify admin(s)
            await db.query(`
                INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                SELECT ?, ?, ?, id, 'TASK_SUBMITTED', ?, 0, NOW()
                FROM employees WHERE role = 'Admin' OR role = 'admin'
            `, [task.site_id, task.phase_id, taskId, `Task "${task.name}" submitted for approval`]);

        }

        res.json({ message: 'Task submitted for approval' });
    } catch (error) {
        console.error('Error completing task:', error);
        require('fs').appendFileSync('error_log.txt', `[${new Date().toISOString()}] Error in completeTask: ${error.message}\n${error.stack}\n`);
        res.status(500).json({ message: 'Error completing task', error: error.message });
    }
};

// Approve Task
exports.approveTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const adminId = req.user.id;

        // Verify Admin
        if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can approve tasks' });
        }

        // Update status and record who approved
        await db.query(
            'UPDATE tasks SET status = "completed", approved_by = ?, approved_at = NOW() WHERE id = ?',
            [adminId, taskId]
        );

        // Notify All Assigned Employees
        const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);
        if (taskData.length > 0) {
            const task = taskData[0];
            const [assignees] = await db.query('SELECT employee_id FROM task_assignments WHERE task_id = ?', [taskId]);

            for (const assignee of assignees) {
                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                    VALUES (?, ?, ?, ?, 'TASK_APPROVED', ?, 0, NOW())
                `, [task.site_id, task.phase_id, taskId, assignee.employee_id, `Your work on "${task.name}" has been approved!`]);
            }

            // Add system message to chat
            await db.query(`
                INSERT INTO task_messages (task_id, sender_id, type, content)
                VALUES (?, ?, 'system', '✅ Good work! Task approved and completed by admin.')
            `, [taskId, adminId]);
        }

        res.json({ message: 'Task approved' });
    } catch (error) {
        console.error('Error approving task:', error);
        res.status(500).json({ message: 'Error approving task' });
    }
};

// Reject Task (Request Changes)
exports.rejectTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const adminId = req.user.id;
        const { reason } = req.body; // Optional reason

        // Verify Admin
        if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can reject tasks' });
        }

        // Update status back to change_required and reset progress (e.g. keep high or reset? User said "Mark as Completed button becomes active again")
        // We'll set it to 'change_required'.
        await db.query(
            'UPDATE tasks SET status = "change_required", progress = 99, completed_by = NULL, completed_at = NULL WHERE id = ?',
            [taskId]
        );

        // Notify All Assigned Employees
        const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);
        if (taskData.length > 0) {
            const task = taskData[0];
            const [assignees] = await db.query('SELECT employee_id FROM task_assignments WHERE task_id = ?', [taskId]);

            for (const assignee of assignees) {
                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                    VALUES (?, ?, ?, ?, 'TASK_REJECTED', ?, 0, NOW())
                `, [task.site_id, task.phase_id, taskId, assignee.employee_id, `Changes requested for "${task.name}". Check chat for details.`]);
            }

            // Add system message to chat
            await db.query(`
                INSERT INTO task_messages (task_id, sender_id, type, content)
                VALUES (?, ?, 'system', ?)
            `, [taskId, adminId, reason ? `Changes requested: ${reason}` : 'Changes requested by Admin.']);
        }

        res.json({ message: 'Changes requested' });
    } catch (error) {
        console.error('Error rejecting task:', error);
        res.status(500).json({ message: 'Error rejecting task' });
    }
};
// Toggle Task Assignment
// Toggle Task Assignment
exports.toggleTaskAssignment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { employeeId, dueDate } = req.body;

        // Check if assignment exists
        const [existing] = await db.query(
            'SELECT id FROM task_assignments WHERE task_id = ? AND employee_id = ?',
            [taskId, employeeId]
        );

        if (existing.length > 0) {
            // Remove assignment
            await db.query('DELETE FROM task_assignments WHERE id = ?', [existing[0].id]);
        } else {
            // Add assignment with timestamp
            await db.query(
                'INSERT INTO task_assignments (task_id, employee_id, assigned_at) VALUES (?, ?, NOW())',
                [taskId, employeeId]
            );

            // Update Due Date if provided
            let formattedDate = null;
            if (dueDate) {
                // Convert DD/MM/YYYY to YYYY-MM-DD
                if (dueDate.includes('/')) {
                    const [d, m, y] = dueDate.split('/');
                    formattedDate = `${y}-${m}-${d}`;
                } else {
                    formattedDate = dueDate;
                }
                await db.query('UPDATE tasks SET due_date = ? WHERE id = ?', [formattedDate, taskId]);
            }

            // Notification
            const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);
            if (taskData.length > 0) {
                const { site_id, phase_id, name } = taskData[0];
                const message = `You have been assigned to task: "${name}"${dueDate ? `. Due: ${dueDate}` : ''}`;

                await db.query(`
                    INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                    VALUES (?, ?, ?, ?, 'ASSIGNMENT', ?, 0, NOW())
                `, [site_id, phase_id, taskId, employeeId, message]);
            }
        }

        // Get updated assignments for this task
        const [assignments] = await db.query(`
            SELECT ta.employee_id
            FROM task_assignments ta
            WHERE ta.task_id = ?
        `, [taskId]);

        const assignmentIds = assignments.map(a => ({ id: a.employee_id }));

        res.json({
            message: existing.length > 0 ? 'Assignment removed' : 'Assignment added',
            assignments: assignmentIds
        });

    } catch (error) {
        console.error('Error toggling task assignment:', error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};

// Helper to ensure YYYY-MM-DD format for MySQL
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

// Update Task Details
exports.updateTask = async (req, res) => {
    try {
        const { id: taskId } = req.params;
        const { name, status, start_date, due_date, amount, assigned_to } = req.body;

        // Update basic task details
        await db.query(`
            UPDATE tasks 
            SET name = COALESCE(?, name),
                status = COALESCE(?, status),
                start_date = ?,
                due_date = ?,
                amount = COALESCE(?, amount)
            WHERE id = ?
        `, [name, status, ensureIsoDate(start_date), ensureIsoDate(due_date), amount, taskId]);

        // Handle Assignment if provided
        if (assigned_to !== undefined) {
            // First, remove existing assignments
            await db.query('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);

            // If a new assignee is provided, add them
            const assigneeIds = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
            const validAssigneeIds = assigneeIds.filter(id => id); // Filter out null/undefined/empty

            if (validAssigneeIds.length > 0) {
                const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);

                for (const empId of validAssigneeIds) {
                    await db.query(`
                        INSERT INTO task_assignments (task_id, employee_id) 
                        VALUES (?, ?)
                    `, [taskId, empId]);

                    // Notify the new assignee
                    if (taskData.length > 0) {
                        const { site_id, phase_id, name: taskName } = taskData[0];
                        const message = `You have been assigned to task: "${taskName}"${due_date ? `. Due: ${due_date}` : ''}`;

                        await db.query(`
                            INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                            VALUES (?, ?, ?, ?, 'ASSIGNMENT', ?, 0, NOW())
                        `, [site_id, phase_id, taskId, empId, message]);
                    }
                }
            }
        }

        res.json({ message: 'Task updated successfully' });

    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task: ' + error.message });
    }
};
