const db = require('./config/db');

async function verifyNotificationType() {
    try {
        console.log('Checking notifications table type column definition...');
        const [rows] = await db.query("SHOW COLUMNS FROM notifications LIKE 'type'");
        if (rows.length > 0) {
            console.log('COLUMN FOUND:', JSON.stringify(rows[0], null, 2));
        } else {
            console.log('COLUMN NOT FOUND: type in notifications');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyNotificationType();
