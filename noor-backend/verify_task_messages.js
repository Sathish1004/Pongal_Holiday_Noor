const db = require('./config/db');

async function verifyTaskMessages() {
    try {
        console.log('Checking task_messages table columns...');
        const [rows] = await db.query("SHOW COLUMNS FROM task_messages");
        console.log('COLUMNS:', rows.map(r => `${r.Field} (${r.Type})`));

        const [typeCol] = await db.query("SHOW COLUMNS FROM task_messages LIKE 'type'");
        if (typeCol.length > 0) {
            console.log('TYPE COLUMN:', JSON.stringify(typeCol[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyTaskMessages();
