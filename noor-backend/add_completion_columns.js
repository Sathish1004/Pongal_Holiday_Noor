const db = require('./config/db');

async function addCompletionColumns() {
    try {
        console.log('Adding completion and approval columns to tasks...');

        const updates = [
            "ADD COLUMN completed_by INT DEFAULT NULL",
            "ADD COLUMN completed_at DATETIME DEFAULT NULL",
            "ADD COLUMN approved_by INT DEFAULT NULL",
            "ADD COLUMN approved_at DATETIME DEFAULT NULL"
        ];

        for (const update of updates) {
            try {
                await db.query(`ALTER TABLE tasks ${update}`);
                console.log(`Executed: ${update}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Skipped (exists): ${update}`);
                } else {
                    console.error(`Error: ${update}`, err.message);
                }
            }
        }

        // Add foreign keys separately to avoid issues if column failed
        try {
            await db.query("ALTER TABLE tasks ADD CONSTRAINT fk_completed_by FOREIGN KEY (completed_by) REFERENCES employees(id) ON DELETE SET NULL");
            console.log("Added FK for completed_by");
        } catch (err) { console.log("FK completed_by might already exist or failed", err.message); }

        try {
            await db.query("ALTER TABLE tasks ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL");
            console.log("Added FK for approved_by");
        } catch (err) { console.log("FK approved_by might already exist or failed", err.message); }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

addCompletionColumns();
