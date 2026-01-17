const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Adding payment_method column to transactions table...');
        await db.query(`
            ALTER TABLE transactions
            ADD COLUMN payment_method VARCHAR(50) NULL AFTER amount;
        `);
        console.log('payment_method column added successfully.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('payment_method column already exists.');
        } else {
            console.error('Error updating schema:', error);
        }
    } finally {
        process.exit();
    }
}

updateSchema();
