const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'noor_construction_db'
};

async function checkTypes() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [types] = await connection.execute('SELECT DISTINCT type, COUNT(*) as count FROM notifications GROUP BY type');
        console.log('Distinct Types:', JSON.stringify(types, null, 2));
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTypes();
