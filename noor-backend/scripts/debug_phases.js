const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function checkPhaseColumns() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('DESCRIBE phases');
        console.log('Phases Columns:', rows.map(r => r.Field));
        await connection.end();
    } catch (error) {
        console.error(error);
    }
}

checkPhaseColumns();
