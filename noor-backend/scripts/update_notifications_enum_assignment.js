const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Updating notifications table schema...');

        // Update ENUM to include 'ASSIGNMENT'
        await db.query(`
            ALTER TABLE notifications 
            MODIFY COLUMN type ENUM('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED', 'ASSIGNMENT') NOT NULL
        `);

        console.log('Schema updated successfully: Added ASSIGNMENT type');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
