const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
};

async function updateDb() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        const sql = `
        CREATE TABLE IF NOT EXISTS stage_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phase_id INT NOT NULL,
            sender_id INT NOT NULL,
            content TEXT,
            type VARCHAR(50) DEFAULT 'text',
            media_url TEXT,
            sender_role VARCHAR(50) DEFAULT 'employee',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS stage_updates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phase_id INT NOT NULL,
            employee_id INT,
            employee_name VARCHAR(255),
            message TEXT,
            previous_progress INT DEFAULT 0,
            new_progress INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS stage_todos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phase_id INT NOT NULL,
            content TEXT NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
        );
        `;

        console.log('Creating stage tables...');
        await connection.query(sql);
        console.log('Tables created successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateDb();
