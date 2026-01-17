const db = require('./config/db');

async function debugCompleteTask() {
    const taskId = 1107; // From screenshot
    const employeeId = 15; // From previous check_admins output (just a valid employee ID)

    try {
        console.log(`Testing completeTask for Task ID: ${taskId}`);

        // 1. Update Task
        console.log('Attempting UPDATE tasks...');
        await db.query(
            'UPDATE tasks SET status = "waiting_for_approval", progress = 100, completed_by = ?, completed_at = NOW() WHERE id = ?',
            [employeeId, taskId]
        );
        console.log('UPDATE successful.');

        // 2. Fetch Task Data for Notification
        const [taskData] = await db.query('SELECT site_id, phase_id, name FROM tasks WHERE id = ?', [taskId]);
        if (taskData.length === 0) {
            console.log('Task not found');
            return;
        }
        const task = taskData[0];
        console.log('Task Data:', task);

        // 3. Insert Notification (The suspect)
        console.log('Attempting INSERT notifications...');
        // This is the query I modified
        await db.query(`
                INSERT INTO notifications (project_id, phase_id, task_id, employee_id, type, message, is_read, created_at)
                SELECT ?, ?, ?, id, 'TASK_SUBMITTED', ?, 0, NOW()
                FROM employees WHERE role = 'Admin' OR role = 'admin'
        `, [task.site_id, task.phase_id, taskId, `Task "${task.name}" submitted for approval`]);

        console.log('INSERT successful.');

    } catch (error) {
        console.error('❌ ERROR CAUGHT:', error);
    } finally {
        process.exit();
    }
}

debugCompleteTask();
