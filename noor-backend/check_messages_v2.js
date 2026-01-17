const db = require('./config/db');

async function checkTaskMessages() {
    try {
        const [messages] = await db.query(`
            SELECT tm.id, tm.type, tm.content, p.site_id
            FROM task_messages tm
            JOIN tasks t ON tm.task_id = t.id
            JOIN phases p ON t.phase_id = p.id
            WHERE tm.type != 'text'
        `);
        console.log('Non-text Task Messages:', JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error checking task messages:', error);
    } finally {
        process.exit();
    }
}

checkTaskMessages();
