const db = require('./config/db');

async function addTaskProgress() {
    try {
        console.log('Adding progress column to tasks table...');
        try {
            await db.query(`ALTER TABLE tasks ADD COLUMN progress INT DEFAULT 0 AFTER status`);
            console.log('Added progress column to tasks');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('progress column already exists in tasks');
            } else {
                console.error('Error altering tasks:', err.message);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

addTaskProgress();
