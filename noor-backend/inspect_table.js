const db = require('./config/db');

async function inspectTable() {
    try {
        const [rows] = await db.query('DESCRIBE task_messages');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectTable();
