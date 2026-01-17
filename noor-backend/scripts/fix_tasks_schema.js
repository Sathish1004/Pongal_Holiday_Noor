const db = require('../config/db');

async function fixTasksSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await db.getConnection();

        console.log('Adding progress column to tasks...');
        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN progress INT DEFAULT 0");
        } catch (e) { console.log('progress column might already exist or error:', e.message); }

        console.log('Adding completed_by column to tasks...');
        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN completed_by INT");
        } catch (e) { console.log('completed_by column might already exist or error:', e.message); }

        console.log('Adding completed_at column to tasks...');
        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN completed_at DATETIME");
        } catch (e) { console.log('completed_at column might already exist or error:', e.message); }

        console.log('Updating status ENUM...');
        try {
            await connection.query("ALTER TABLE tasks MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'delayed', 'waiting_for_approval') DEFAULT 'pending'");
        } catch (e) { console.log('Status enum update failed:', e.message); }

        console.log('Tasks schema updated successfully.');
    } catch (error) {
        console.error('Fatal error updating schema:', error);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

fixTasksSchema();
