const db = require('./config/db');

async function updateStatusColumn() {
    try {
        console.log('Modifying status column in tasks table to VARCHAR(50)...');
        // We modify it to VARCHAR to allow any status including 'waiting_for_approval'
        await db.query(`ALTER TABLE tasks MODIFY COLUMN status VARCHAR(50) DEFAULT 'Not Started'`);
        console.log('Status column updated to VARCHAR(50)');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateStatusColumn();
