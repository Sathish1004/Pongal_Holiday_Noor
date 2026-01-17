const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'noor_construction_db'
};

async function checkFiles() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [files] = await connection.execute(`
            SELECT id, content as url, type, site_id, task_id 
            FROM task_messages 
            WHERE type IN ('image', 'video', 'document') 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.log('Recent Files:', JSON.stringify(files, null, 2));
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkFiles();
