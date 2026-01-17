const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'noor_workforce_db'
};

async function checkData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [employees] = await connection.query('SELECT id, name, email FROM employees');
        const [tasks] = await connection.query('SELECT id, name, status, employee_id FROM tasks');
        const [assignments] = await connection.query('SELECT * FROM site_assignments');

        console.log(JSON.stringify({ employees, tasks, assignments }, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
