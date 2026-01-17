const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Adding amount column to phases table...');
        try {
            await db.execute(`
                ALTER TABLE phases 
                ADD COLUMN budget DECIMAL(15, 2) DEFAULT 0.00 AFTER name
            `);
            console.log('Added budget column to phases.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Budget column already exists in phases.');
            } else {
                console.error('Error adding budget column:', error.message);
            }
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
}

updateSchema();
