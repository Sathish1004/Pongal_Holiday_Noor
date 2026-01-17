const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Create task_assignments table
        console.log('Creating task_assignments table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS task_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                employee_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assignment (task_id, employee_id)
            )
        `);

        // 2. Migrate existing data from tasks table
        console.log('Migrating existing assignments...');
        const [tasks] = await db.query('SELECT id, employee_id FROM tasks WHERE employee_id IS NOT NULL');

        let migratedCount = 0;
        for (const task of tasks) {
            // Check if already exists to prevent duplicates if run multiple times
            const [exists] = await db.query('SELECT id FROM task_assignments WHERE task_id = ? AND employee_id = ?', [task.id, task.employee_id]);
            if (exists.length === 0) {
                await db.query('INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)', [task.id, task.employee_id]);
                migratedCount++;
            }
        }
        console.log(`Migrated ${migratedCount} assignments.`);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
