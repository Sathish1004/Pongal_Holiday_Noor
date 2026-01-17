
const db = require('../config/db');

async function checkSchema() {
    try {
        console.log('--- PHASES ---');
        const [phases] = await db.query('DESCRIBE phases');
        console.log(phases.map(c => c.Field));

        console.log('--- CHECKING IF NEW TABLES EXIST ---');
        const [tables] = await db.query("SHOW TABLES LIKE 'stage_%'");
        console.log(tables);

    } catch (error) {
        console.error(error);
    }
    process.exit();
}

checkSchema();
