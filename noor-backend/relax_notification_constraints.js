const db = require('./config/db');

async function relaxNotificationConstraints() {
    try {
        console.log('Dropping FK constraint notifications_ibfk_4 on notifications table...');

        // We target the specific constraint mentioned in the error: notifications_ibfk_4
        try {
            await db.query(`ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_4`);
            console.log('Dropped notifications_ibfk_4');
        } catch (err) {
            console.error('Error dropping FK (might not exist):', err.message);
        }

        // Just in case, let's verify if there are other similar constraints by name pattern? 
        // No, let's stick to the reported error first.

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

relaxNotificationConstraints();
