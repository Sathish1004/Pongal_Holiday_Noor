const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'noor_construction_db'
};

async function checkSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [columns] = await connection.execute('DESCRIBE task_messages');
        console.log('Columns:', columns.map(c => c.Field));
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();
