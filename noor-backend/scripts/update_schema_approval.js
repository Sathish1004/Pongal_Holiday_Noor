const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Updating phases table schema...');

        // 1. Modify ENUM to include new statuses
        // We keep 'pending' and 'completed' for backward compatibility during migration, 
        // but add 'waiting_for_approval' and 'achieved'.
        await db.query(`
            ALTER TABLE phases 
            MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'waiting_for_approval', 'achieved') 
            DEFAULT 'pending'
        `);
        console.log('Updated status ENUM.');

        // 2. Add approval columns if they don't exist
        try {
            await db.query(`
                ALTER TABLE phases
                ADD COLUMN approved_by INT NULL,
                ADD COLUMN approved_at TIMESTAMP NULL,
                ADD CONSTRAINT fk_phase_approver FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
            `);
            console.log('Added approval columns.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Approval columns already exist.');
            } else {
                throw err;
            }
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
