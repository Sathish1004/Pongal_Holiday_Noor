const db = require('./config/db');
const fs = require('fs');

async function fixDatabase() {
    const log = [];
    try {
        log.push('Attempting to drop Foreign Key task_messages_ibfk_2 on task_messages...');

        try {
            await db.query('ALTER TABLE task_messages DROP FOREIGN KEY task_messages_ibfk_2');
            log.push('Successfully dropped Foreign Key.');
        } catch (err) {
            log.push('Error dropping FK: ' + err.message);
        }

        try {
            // Also drop the index usually created with the FK if we want to be thorough, but FK drop is enough.
        } catch (e) { }

        log.push('Database fix complete.');
    } catch (error) {
        log.push('Fatal Error: ' + error.message);
    } finally {
        fs.writeFileSync('db_fix_log.txt', log.join('\n'));
        process.exit(0);
    }
}

fixDatabase();
