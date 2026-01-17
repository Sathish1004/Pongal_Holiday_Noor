const db = require('./config/db');

async function verifyTaskProgressColumn() {
    try {
        console.log('Checking tasks table for progress column...');
        const [rows] = await db.query("SHOW COLUMNS FROM tasks LIKE 'progress'");
        if (rows.length > 0) {
            console.log('COLUMN FOUND: progress in tasks');
        } else {
            console.log('COLUMN NOT FOUND: progress in tasks');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyTaskProgressColumn();
