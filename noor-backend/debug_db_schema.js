
const db = require('./config/db');

async function debugSchema() {
    try {
        console.log('Describing projects table...');
        const [rows] = await db.query('DESCRIBE projects');
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error describing table:', error);
        process.exit(1);
    }
}

debugSchema();
