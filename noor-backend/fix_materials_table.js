
const db = require('./config/db');

async function fixTable() {
    try {
        console.log('Fixing material_requests table...');
        try {
            await db.query(`
                ALTER TABLE material_requests 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log("✅ Added created_at and updated_at columns.");
        } catch (e) {
            console.log("⚠️  Could not add columns:", e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing table:', error);
        process.exit(1);
    }
}

fixTable();
