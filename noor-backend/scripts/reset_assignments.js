const db = require('../config/db');

async function resetAssignments() {
    try {
        console.log('Resetting all task assignments...');

        // 1. Clear task_assignments table
        console.log('Clearing task_assignments table...');
        await db.query('DELETE FROM task_assignments');

        // 2. Clear legacy employee_id in tasks table
        console.log('Clearing legacy assignments in tasks table...');
        await db.query('UPDATE tasks SET employee_id = NULL');

        console.log('All assignments have been removed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to reset assignments:', error);
        process.exit(1);
    }
}

resetAssignments();
