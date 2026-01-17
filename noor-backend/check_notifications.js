const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'noor_construction_db'
};

async function checkNotifications() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Notifications:', JSON.stringify(rows, null, 2));

        const [count] = await connection.execute('SELECT COUNT(*) as count FROM notifications');
        console.log('Total Notifications:', count[0].count);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkNotifications();
