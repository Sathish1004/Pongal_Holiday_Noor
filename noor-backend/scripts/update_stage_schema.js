
const db = require('../config/db');

async function migrate() {
    try {
        console.log('Running Stage Schema Migration...');

        // 1. Update PHASES table
        // Add columns if they don't exist. Using stored procedures or just try/catch add
        try {
            await db.query(`
                ALTER TABLE phases 
                ADD COLUMN start_date DATE NULL,
                ADD COLUMN due_date DATE NULL,
                ADD COLUMN progress INT DEFAULT 0,
                ADD COLUMN completed_by INT NULL,
                ADD COLUMN completed_at DATETIME NULL;
            `);
            console.log('Updated phases table columns.');
        } catch (e) {
            console.log('Phases columns might already exist or error:', e.message);
        }

        // 2. Create stage_todos
        await db.query(`
            CREATE TABLE IF NOT EXISTS stage_todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phase_id INT NOT NULL,
                content TEXT NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
            )
        `);
        console.log('Created stage_todos table.');

        // 3. Create stage_updates
        await db.query(`
            CREATE TABLE IF NOT EXISTS stage_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phase_id INT NOT NULL,
                employee_id INT NOT NULL,
                previous_progress INT DEFAULT 0,
                new_progress INT NOT NULL,
                message TEXT,
                status VARCHAR(20) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
            )
        `);
        console.log('Created stage_updates table.');

        // 4. Create stage_messages
        await db.query(`
            CREATE TABLE IF NOT EXISTS stage_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phase_id INT NOT NULL,
                sender_id INT NOT NULL,
                type ENUM('text', 'image', 'audio') DEFAULT 'text',
                content TEXT,
                media_url TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
            )
        `);
        console.log('Created stage_messages table.');

        console.log('Migration Complete.');
        process.exit();

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
