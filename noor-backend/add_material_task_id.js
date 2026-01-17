const db = require('./config/db');

const addTaskIdColumn = async () => {
    try {
        console.log('Adding task_id column to material_requests table...');

        // Add task_id column
        await db.query(`
            ALTER TABLE material_requests 
            ADD COLUMN task_id INT DEFAULT NULL,
            ADD CONSTRAINT fk_material_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
        `);

        console.log('Successfully added task_id column and foreign key constraint.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column task_id already exists.');
            process.exit(0);
        }
        console.error('Error updating schema:', error);
        process.exit(1);
    }
};

addTaskIdColumn();
