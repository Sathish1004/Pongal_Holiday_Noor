const db = require('./config/db');

async function checkTriggers() {
    try {
        const [rows] = await db.query("SHOW TRIGGERS LIKE 'tasks'");
        console.log('Triggers on tasks table:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkTriggers();
