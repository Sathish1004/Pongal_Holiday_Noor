const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Checking task_messages schema...');
        try {
            await db.query(`ALTER TABLE task_messages ADD COLUMN type VARCHAR(50) DEFAULT 'text' AFTER sender_id`);
            console.log('Added type column to task_messages');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('type column already exists in task_messages');
            } else {
                console.error('Error altering task_messages:', err.message);
            }
        }

        console.log('Checking stage_messages schema...');
        try {
            await db.query(`ALTER TABLE stage_messages ADD COLUMN type VARCHAR(50) DEFAULT 'text' AFTER sender_id`);
            console.log('Added type column to stage_messages');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('type column already exists in stage_messages');
            } else {
                console.error('Error altering stage_messages:', err.message);
            }
        }

        /* Also check for sender_role in stage_messages as siteController uses it */
        console.log('Checking stage_messages sender_role schema...');
        try {
            await db.query(`ALTER TABLE stage_messages ADD COLUMN sender_role VARCHAR(50) DEFAULT NULL AFTER sender_id`);
            console.log('Added sender_role column to stage_messages');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('sender_role column already exists in stage_messages');
            } else {
                console.error('Error altering stage_messages (sender_role):', err.message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateSchema();
