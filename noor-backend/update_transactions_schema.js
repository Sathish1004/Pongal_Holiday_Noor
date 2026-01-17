const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Starting Schema Update...');

        // 1. Create transactions table
        console.log('Creating transactions table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                site_id INT NOT NULL,
                type ENUM('IN', 'OUT') NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                phase_id INT DEFAULT NULL,
                description TEXT,
                date DATE NOT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
            )
        `);
        console.log('Verified transactions table.');

        // 2. Add budget column to phases table
        console.log('Checking phases table for budget column...');
        const [columns] = await db.query('SHOW COLUMNS FROM phases LIKE "budget"');
        if (columns.length === 0) {
            console.log('Adding budget column to phases...');
            await db.query('ALTER TABLE phases ADD COLUMN budget DECIMAL(15, 2) DEFAULT 0');
            console.log('Added budget column.');
        } else {
            console.log('Budget column already exists.');
        }

        console.log('Schema Update Completed Successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Schema Update Failed:', error);
        process.exit(1);
    }
}

updateSchema();
