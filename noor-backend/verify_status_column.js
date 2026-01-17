const db = require('./config/db');

async function verifyStatusColumn() {
    try {
        console.log('Checking tasks table status column definition...');
        const [rows] = await db.query("SHOW COLUMNS FROM tasks LIKE 'status'");
        if (rows.length > 0) {
            console.log('COLUMN FOUND:', JSON.stringify(rows[0], null, 2));
        } else {
            console.log('COLUMN NOT FOUND: status in tasks');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyStatusColumn();
