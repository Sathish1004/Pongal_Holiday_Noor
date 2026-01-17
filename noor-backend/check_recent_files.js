const db = require('./config/db');
const fs = require('fs');

async function checkRecentFiles() {
    try {
        console.log('Checking recent file uploads...');
        const [files] = await db.query(`
            SELECT id, type, content, created_at, site_id
            FROM task_messages
            WHERE type IN ('image', 'video', 'document')
            ORDER BY created_at DESC
            LIMIT 5
        `);
        const output = JSON.stringify(files, null, 2);
        fs.writeFileSync('recent_files_log.txt', output);
        console.log('Output written to recent_files_log.txt');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkRecentFiles();
