const db = require('./config/db');

async function verifyColumn() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM task_messages LIKE 'type'");
        if (rows.length > 0) {
            console.log('COLUMN FOUND: type');
        } else {
            console.log('COLUMN NOT FOUND: type');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyColumn();
