const db = require('./config/db');

async function addMediaUrlColumn() {
    try {
        console.log('Checking task_messages schema...');
        try {
            await db.query(`ALTER TABLE task_messages ADD COLUMN media_url TEXT DEFAULT NULL AFTER content`);
            console.log('Added media_url column to task_messages');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('media_url column already exists in task_messages');
            } else {
                console.error('Error altering task_messages:', err.message);
            }
        }

        console.log('Checking stage_messages schema...');
        try {
            await db.query(`ALTER TABLE stage_messages ADD COLUMN media_url TEXT DEFAULT NULL AFTER content`);
            console.log('Added media_url column to stage_messages');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('media_url column already exists in stage_messages');
            } else {
                console.error('Error altering stage_messages:', err.message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

addMediaUrlColumn();
