const db = require('./config/db');

async function verifyMediaColumn() {
    try {
        console.log('Checking task_messages for media_url...');
        const [rowsTask] = await db.query("SHOW COLUMNS FROM task_messages LIKE 'media_url'");
        if (rowsTask.length > 0) {
            console.log('COLUMN FOUND: media_url in task_messages');
        } else {
            console.log('COLUMN NOT FOUND: media_url in task_messages');
        }

        console.log('Checking stage_messages for media_url...');
        const [rowsStage] = await db.query("SHOW COLUMNS FROM stage_messages LIKE 'media_url'");
        if (rowsStage.length > 0) {
            console.log('COLUMN FOUND: media_url in stage_messages');
        } else {
            console.log('COLUMN NOT FOUND: media_url in stage_messages');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyMediaColumn();
