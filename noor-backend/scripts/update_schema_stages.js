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

        // 1. Stage Updates Table (Progress history for phases)
        console.log('Creating stage_updates table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS stage_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phase_id INT NOT NULL,
                employee_id INT NOT NULL,
                message TEXT,
                previous_progress INT DEFAULT 0,
                new_progress INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        // 2. Stage Messages Table (Chat for phases)
        console.log('Creating stage_messages table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS stage_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phase_id INT NOT NULL,
                sender_id INT, 
                type ENUM('text', 'image', 'audio', 'document', 'system') DEFAULT 'text',
                content TEXT,
                media_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES employees(id) ON DELETE SET NULL
            )
        `);

        // 3. Stage Todos Table (Checklist within a phase)
        console.log('Creating stage_todos table...');
        await connection.execute(`
             CREATE TABLE IF NOT EXISTS stage_todos (
                 id INT AUTO_INCREMENT PRIMARY KEY,
                 phase_id INT NOT NULL,
                 employee_id INT, 
                 content VARCHAR(255) NOT NULL,
                 is_completed BOOLEAN DEFAULT FALSE,
                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                 FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE,
                 FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
             )
         `);

        console.log('Stage schema update completed successfully.');

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
