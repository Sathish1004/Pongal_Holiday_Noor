const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Starting schema update...');

        // 1. Add phone column if it doesn't exist
        try {
            await db.execute(`
                ALTER TABLE employees 
                ADD COLUMN phone VARCHAR(20) UNIQUE AFTER name
            `);
            console.log('Added phone column.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Phone column already exists.');
            } else {
                console.error('Error adding phone column:', error.message);
            }
        }

        // 2. Add status column if it doesn't exist
        try {
            await db.execute(`
                ALTER TABLE employees 
                ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER role
            `);
            console.log('Added status column.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Status column already exists.');
            } else {
                console.error('Error adding status column:', error.message);
            }
        }

        // 3. Update role ENUM
        // Note: We can't easily check if an ENUM already contains a value without parsing output.
        // We will just run the ALTER to extend the list. 
        // We include 'employee' to maintain backward compatibility for existing rows.
        try {
            await db.execute(`
                ALTER TABLE employees 
                MODIFY COLUMN role ENUM('admin', 'employee', 'supervisor', 'worker', 'engineer') DEFAULT 'worker'
            `);
            console.log('Updated role ENUM.');
        } catch (error) {
            console.error('Error updating role ENUM:', error.message);
        }

        console.log('Schema update complete.');
        process.exit(0);

    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
}

updateSchema();
