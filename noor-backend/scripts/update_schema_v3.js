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

        // 1. Task Updates Table (Progress history)
        console.log('Creating task_updates table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS task_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                employee_id INT NOT NULL,
                previous_progress INT DEFAULT 0,
                new_progress INT NOT NULL,
                note TEXT,
                image_url VARCHAR(500),
                audio_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        // 2. Task Messages Table (Chat)
        console.log('Creating task_messages table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS task_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                sender_id INT NOT NULL,
                type ENUM('text', 'image', 'audio', 'document') DEFAULT 'text',
                content TEXT,
                media_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        // 3. Todos Table (Checklist within a task)
        console.log('Creating todos table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                employee_id INT, 
                content VARCHAR(255) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
            )
        `);

        // 4. Add progress column to tasks if not exists (it might be missing or useful to cache current progress)
        // Checking if 'progress' column exists in 'tasks' table
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'progress'
        `, [dbConfig.database]);

        if (columns.length === 0) {
            console.log('Adding progress column to tasks table...');
            await connection.execute(`
                ALTER TABLE tasks
                ADD COLUMN progress INT DEFAULT 0
            `);
        }

        console.log('Schema update v3 completed successfully.');

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
