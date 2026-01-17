const db = require('./config/db');
const fs = require('fs');

async function debugFiles() {
    try {
        let output = '';

        // 1. List All Sites
        const [sites] = await db.query('SELECT id, name FROM sites');
        output += `All Sites: ${JSON.stringify(sites, null, 2)}\n\n`;

        // 2. List All Non-Text Messages
        const [files] = await db.query(`
            SELECT tm.id, tm.type, tm.content, tm.task_id, t.name as task_name, p.site_id, s.name as site_name
            FROM task_messages tm
            LEFT JOIN tasks t ON tm.task_id = t.id
            LEFT JOIN phases p ON t.phase_id = p.id
            LEFT JOIN sites s ON p.site_id = s.id
            WHERE tm.type != 'text'
        `);
        output += `All Files in DB: ${JSON.stringify(files, null, 2)}\n\n`;

        fs.writeFileSync('debug_output.txt', output);
        console.log('Debug info written to debug_output.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugFiles();
