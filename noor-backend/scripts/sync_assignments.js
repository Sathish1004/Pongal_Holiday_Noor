const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'noor_workforce_db'
};

async function syncAssignments() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB. Syncing assignments...');

        // 1. Get all phases with assigned employee
        const [phases] = await connection.query('SELECT id, assigned_to FROM phases WHERE assigned_to IS NOT NULL');

        console.log(`Found ${phases.length} assigned phases.`);

        for (const phase of phases) {
            // 2. Update tasks
            const [result] = await connection.query(
                'UPDATE tasks SET employee_id = ? WHERE phase_id = ? AND employee_id IS NULL',
                [phase.assigned_to, phase.id]
            );
            if (result.changedRows > 0) {
                console.log(`Phase ${phase.id}: Assigned ${result.changedRows} tasks to Employee ${phase.assigned_to}`);
            }
        }

        console.log('Sync complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

syncAssignments();
