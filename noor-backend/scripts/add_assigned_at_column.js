const db = require('../config/db');

async function addAssignedAtColumn() {
    try {
        console.log('Adding assigned_at column to task_assignments table...');

        // Check if column already exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'noor_construction' 
            AND TABLE_NAME = 'task_assignments' 
            AND COLUMN_NAME = 'assigned_at'
        `);

        if (columns.length > 0) {
            console.log('Column assigned_at already exists.');
            return;
        }

        // Add the column
        await db.query(`
            ALTER TABLE task_assignments 
            ADD COLUMN assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        console.log('✓ Column assigned_at added successfully');

        // Update existing records to have a timestamp
        await db.query(`
            UPDATE task_assignments 
            SET assigned_at = CURRENT_TIMESTAMP 
            WHERE assigned_at IS NULL
        `);

        console.log('✓ Existing records updated with current timestamp');

    } catch (error) {
        console.error('Error adding assigned_at column:', error);
        throw error;
    } finally {
        process.exit();
    }
}

addAssignedAtColumn();
