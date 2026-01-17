const db = require('./config/db');

async function verifyNotificationsSchema() {
    try {
        console.log('Checking notifications table columns...');
        const [rows] = await db.query("SHOW COLUMNS FROM notifications");
        console.log('COLUMNS:', rows.map(r => `${r.Field} (${r.Type})`));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyNotificationsSchema();
