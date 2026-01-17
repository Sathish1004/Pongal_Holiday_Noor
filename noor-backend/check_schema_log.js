const db = require('./config/db');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rows] = await db.query('SHOW CREATE TABLE task_messages');
        const schema = rows[0]['Create Table'];
        fs.writeFileSync('schema_log.txt', schema);
        console.log('Schema logged to schema_log.txt');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
