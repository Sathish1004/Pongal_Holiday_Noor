const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'noor_workforce_db'
};

async function updateSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Check if assigned_to column exists in phases table
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'phases' AND COLUMN_NAME = 'assigned_to'
        `, [dbConfig.database]);

        if (columns.length === 0) {
            console.log('Adding assigned_to column to phases table...');
            await connection.execute(`
                ALTER TABLE phases
                ADD COLUMN assigned_to INT NULL,
                ADD CONSTRAINT fk_phase_employee
                FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
            `);
            console.log('Column assigned_to added successfully.');
        } else {
            console.log('Column assigned_to already exists.');
        }

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
