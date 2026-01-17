const db = require('./config/db');

async function updateStatusColumn() {
    try {
        console.log('Modifying status column in tasks table to VARCHAR(255)...');
        await db.query(`ALTER TABLE tasks MODIFY COLUMN status VARCHAR(255) DEFAULT 'Not Started'`);
        console.log('Status column updated to VARCHAR(255)');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateStatusColumn();
