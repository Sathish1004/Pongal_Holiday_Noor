const db = require('./config/db');

async function checkSchema() {
    try {
        console.log('Checking phases table columns...');
        const [columns] = await db.query("SHOW COLUMNS FROM phases");
        console.log(columns);

        console.log('Checking a sample phase...');
        const [rows] = await db.query("SELECT * FROM phases LIMIT 1");
        console.log(rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
