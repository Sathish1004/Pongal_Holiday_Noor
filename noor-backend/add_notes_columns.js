
const db = require('./config/db');

async function fixTable() {
    try {
        console.log('Adding notes columns to material_requests...');

        try {
            await db.query(`
                ALTER TABLE material_requests 
                ADD COLUMN notes TEXT,
                ADD COLUMN admin_notes TEXT
            `);
            console.log("✅ Added notes and admin_notes columns.");
        } catch (e) {
            console.log("⚠️  Could not add columns (maybe they exist):", e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing table:', error);
        process.exit(1);
    }
}

fixTable();
