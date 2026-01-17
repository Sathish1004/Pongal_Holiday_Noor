const db = require('./config/db');

async function checkTables() {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const [filesSchema] = await db.query('DESCRIBE project_files');
        console.log('project_files Schema:', filesSchema);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('project_files table does not exist. Checking "files"...');
            try {
                const [filesSchema2] = await db.query('DESCRIBE files');
                console.log('files Schema:', filesSchema2);
            } catch (e) {
                console.log('files table does not exist either.');
            }
        } else {
            console.error(error);
        }
    } finally {
        process.exit();
    }
}

checkTables();
