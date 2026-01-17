
const db = require('./config/db');

async function debugSchema() {
    try {
        console.log('Checking schema for material_requests...');
        const [rows] = await db.query('DESCRIBE material_requests');
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error describing table:', error);
        process.exit(1);
    }
}

debugSchema();
