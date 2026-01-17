const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Fetching existing sites...');
        const [sites] = await db.query('SELECT id, name FROM sites');

        console.log('Fetching master templates...');
        const [templates] = await db.query('SELECT * FROM task_templates ORDER BY order_num');

        for (const site of sites) {
            console.log(`Processing site: ${site.name} (ID: ${site.id})`);

            // 1. Check if tasks already exist to avoid duplicates
            const [existingTasks] = await db.query('SELECT id FROM tasks WHERE site_id = ? LIMIT 1', [site.id]);
            if (existingTasks.length > 0) {
                console.log(`- Site already has tasks. Skipping.`);
                continue;
            }

            // 2. Clear old (empty) phases for this site if any, to rebuild correctly
            await db.query('DELETE FROM phases WHERE site_id = ?', [site.id]);

            // 3. Rebuild phases and tasks from templates
            const phaseMap = new Map(); // phase_name -> phase_id

            for (const template of templates) {
                if (!phaseMap.has(template.phase_name)) {
                    const [phaseResult] = await db.query(
                        'INSERT INTO phases (site_id, name, order_num) VALUES (?, ?, ?)',
                        [site.id, template.phase_name, phaseMap.size + 1]
                    );
                    phaseMap.set(template.phase_name, phaseResult.insertId);
                }

                await db.query(
                    'INSERT INTO tasks (site_id, phase_id, name, status) VALUES (?, ?, ?, "Not Started")',
                    [site.id, phaseMap.get(template.phase_name), template.task_name]
                );
            }
            console.log(`- Successfully populated ${templates.length} tasks and ${phaseMap.size} phases.`);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (db) await db.end();
    }
}

migrate();
