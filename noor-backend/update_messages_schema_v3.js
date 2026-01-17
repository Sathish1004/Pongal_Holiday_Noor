const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Modifying task_messages table...');

        // 1. Add site_id column
        try {
            await db.query(`ALTER TABLE task_messages ADD COLUMN site_id INT NULL AFTER task_id`);
            console.log('Added site_id column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('site_id column already exists.');
            else console.error('Error adding site_id:', e);
        }

        // 2. Make task_id Nullable
        try {
            // We need to check FK constraint? Only if it enforces NOT NULL.
            // Usually MODIFY COLUMN is enough.
            await db.query(`ALTER TABLE task_messages MODIFY COLUMN task_id INT NULL`);
            console.log('Made task_id nullable.');
        } catch (e) {
            console.error('Error modifying task_id:', e);
        }

        console.log('Schema update complete.');

    } catch (error) {
        console.error('Top level error:', error);
    } finally {
        process.exit();
    }
}

updateSchema();
