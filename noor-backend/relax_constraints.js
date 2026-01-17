const db = require('./config/db');

async function relaxConstraints() {
    try {
        console.log('Dropping FK constraint on task_messages...');
        try {
            await db.query(`ALTER TABLE task_messages DROP FOREIGN KEY task_messages_ibfk_2`);
            console.log('Dropped task_messages_ibfk_2');
        } catch (err) {
            console.error('Error dropping FK on task_messages (might not exist):', err.message);
        }

        console.log('Dropping FK constraint on stage_messages...');
        // We need to find the constraint name for stage_messages sender_id. 
        // Often it is stage_messages_ibfk_2 or similar. 
        // To be safe, we'll try to get it from information_schema or just try standard names.
        // For now, let's try the direct drop if we know the name or just try standard convention.
        // A robust way works, but let's try the same naming convention first since it's likely auto-generated or similar.
        // Actually, let's just inspect it first to be sure, OR just try to drop strictly if we knew the name.
        // BUT, for this task, let's assume the user error specifically named `task_messages_ibfk_2`.

        // Let's also check if we can make sender_id nullable if it isn't, though the error was FK constraint.

        // Strategy: Drop the constraint that links sender_id to employees.
        // We will query to find the constraint name for stage_messages just in case.

        const [rows] = await db.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'stage_messages' 
            AND COLUMN_NAME = 'sender_id' 
            AND REFERENCED_TABLE_NAME = 'employees'
            AND TABLE_SCHEMA = DATABASE()
        `);

        if (rows.length > 0) {
            const constraintName = rows[0].CONSTRAINT_NAME;
            console.log(`Found stage_messages constraint: ${constraintName}, dropping...`);
            await db.query(`ALTER TABLE stage_messages DROP FOREIGN KEY ${constraintName}`);
            console.log('Dropped stage_messages sender_id FK');
        } else {
            console.log('No FK constraint found for stage_messages sender_id linking to employees');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

relaxConstraints();
