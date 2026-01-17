const db = require('./config/db');

async function updateMessagesSchema() {
    try {
        console.log('Modifying type column in task_messages table to VARCHAR(50)...');
        await db.query(`ALTER TABLE task_messages MODIFY COLUMN type VARCHAR(50) DEFAULT 'text'`);

        console.log('Modifying sender_id column to allow NULL (for system messages)...');
        await db.query(`ALTER TABLE task_messages MODIFY COLUMN sender_id INT NULL`);

        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateMessagesSchema();
