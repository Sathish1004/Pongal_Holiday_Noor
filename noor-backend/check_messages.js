const db = require('./config/db');

async function checkTaskMessages() {
    try {
        const [messages] = await db.query(`
            SELECT tm.*, t.name as task_name, p.site_id
            FROM task_messages tm
            JOIN tasks t ON tm.task_id = t.id
            JOIN phases p ON t.phase_id = p.id
            WHERE tm.type != 'text'
            LIMIT 10
        `);
        console.log('Task Messages (Non-text):', messages);
    } catch (error) {
        console.error('Error checking task messages:', error);
    } finally {
        process.exit();
    }
}

checkTaskMessages();
