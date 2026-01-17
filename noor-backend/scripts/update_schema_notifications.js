const db = require('../config/db');

async function updateSchema() {
    let connection;
    try {
        console.log('Connecting to database via project config...');
        // db is already a pool promise, so we can just use it directly or get a connection
        connection = await db.getConnection();
        console.log('Connected.');

        // Create Notifications Table
        console.log('Creating notifications table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                phase_id INT NULL,
                task_id INT NULL,
                employee_id INT NOT NULL,
                type ENUM('TASK_UPDATE', 'CHAT_UPDATE', 'STAGE_COMPLETED') NOT NULL,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES sites(id) ON DELETE CASCADE,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
        console.log('Notifications table created or already exists.');

        console.log('Schema update completed successfully.');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        if (connection) connection.release();
        // Close the pool to allow script to exit
        // db.end(); // If db is pool
        process.exit(0);
    }
}

updateSchema();
