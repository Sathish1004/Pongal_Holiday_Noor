const db = require('../config/db');

async function migrate() {
    console.log('Starting Milestones Migration...');

    try {
        // 1. Create Milestones Table
        console.log('Creating milestones table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS milestones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                site_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                status ENUM('Not Started', 'In Progress', 'Completed', 'Delayed') DEFAULT 'Not Started',
                progress INT DEFAULT 0,
                planned_start_date DATE,
                planned_end_date DATE,
                actual_completion_date DATE,
                delay_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
            )
        `);
        console.log('Milestones table created or already exists.');

        // 2. Add milestone_id column to phases table if it doesn't exist
        console.log('Checking phases table columns...');
        const [columns] = await db.query(`SHOW COLUMNS FROM phases LIKE 'milestone_id'`);

        if (columns.length === 0) {
            console.log('Adding milestone_id to phases table...');
            await db.query(`
                ALTER TABLE phases 
                ADD COLUMN milestone_id INT,
                ADD CONSTRAINT fk_phase_milestone FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL
            `);
            console.log('Column milestone_id added to phases.');
        } else {
            console.log('Column milestone_id already exists in phases.');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
