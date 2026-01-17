const db = require('./config/db');

async function testInsert() {
    try {
        console.log('Testing manual insert into task_messages...');
        const siteId = 2; // Assuming Chennai is ID 2
        const url = '/uploads/test-manual.jpg';
        const type = 'image';
        const senderId = 1; // Assuming admin ID 1 exists

        const [result] = await db.query(`
            INSERT INTO task_messages (site_id, task_id, sender_id, type, content, created_at, is_read)
            VALUES (?, NULL, ?, ?, ?, NOW(), 0)
        `, [siteId, senderId, type, url]);

        console.log('Insert success:', result);

        // Verify it exists
        const [rows] = await db.query('SELECT * FROM task_messages WHERE id = ?', [result.insertId]);
        console.log('Record:', rows[0]);

    } catch (error) {
        console.error('Insert failed:', error);
    } finally {
        process.exit();
    }
}

testInsert();
