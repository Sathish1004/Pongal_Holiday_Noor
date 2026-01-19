const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Checking employees table schema...');

        // Check if column exists
        const [columns] = await db.query("SHOW COLUMNS FROM employees LIKE 'password_updated_at'");

        if (columns.length === 0) {
            console.log('Adding password_updated_at column...');
            await db.query("ALTER TABLE employees ADD COLUMN password_updated_at TIMESTAMP DEFAULT NULL");
            console.log('Column added successfully.');
        } else {
            console.log('Column password_updated_at already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateSchema();
