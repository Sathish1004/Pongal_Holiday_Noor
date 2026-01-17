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

async function checkTables() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SHOW TABLES');
        console.log('Tables:', rows.map(r => Object.values(r)[0]));
        await connection.end();
    } catch (error) {
        console.error(error);
    }
}

checkTables();
