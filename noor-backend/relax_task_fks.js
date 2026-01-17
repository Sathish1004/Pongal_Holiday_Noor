const db = require('./config/db');

async function relaxTaskFKs() {
    try {
        console.log('Dropping restrictive FK constraints on tasks table...');

        // Drop fk_approved_by
        try {
            await db.query(`ALTER TABLE tasks DROP FOREIGN KEY fk_approved_by`);
            console.log('Dropped fk_approved_by');
        } catch (err) {
            console.error('Error dropping fk_approved_by (might not exist):', err.message);
        }

        // Drop fk_completed_by (just in case an Admin marks complete)
        try {
            await db.query(`ALTER TABLE tasks DROP FOREIGN KEY fk_completed_by`);
            console.log('Dropped fk_completed_by');
        } catch (err) {
            console.error('Error dropping fk_completed_by (might not exist):', err.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

relaxTaskFKs();
