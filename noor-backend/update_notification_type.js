const db = require('./config/db');

async function updateNotificationType() {
    try {
        console.log('Modifying type column in notifications table to VARCHAR(50)...');
        // We modify it to VARCHAR to allow any notification type including 'TASK_SUBMITTED'
        await db.query(`ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL`);
        console.log('Type column updated to VARCHAR(50)');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateNotificationType();
