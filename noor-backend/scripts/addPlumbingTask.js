const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function update() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Updating master task_templates...');
        await db.query("INSERT INTO task_templates (phase_name, task_name, order_num) VALUES ('Electrical and Plumbing Rough-in', 'Plumbing line inner and outer', 51)");
        console.log('Template updated.');

        console.log('Updating existing projects...');
        const [sites] = await db.query('SELECT id, name FROM sites');
        for (const site of sites) {
            const [phases] = await db.query("SELECT id FROM phases WHERE site_id = ? AND name = 'Electrical and Plumbing Rough-in'", [site.id]);
            if (phases.length > 0) {
                const phaseId = phases[0].id;
                const [existing] = await db.query("SELECT id FROM tasks WHERE site_id = ? AND phase_id = ? AND name = 'Plumbing line inner and outer'", [site.id, phaseId]);
                if (existing.length === 0) {
                    await db.query("INSERT INTO tasks (site_id, phase_id, name, status) VALUES (?, ?, 'Plumbing line inner and outer', 'Not Started')", [site.id, phaseId]);
                    console.log(`- Added task to project: ${site.name}`);
                } else {
                    console.log(`- Task already exists in project: ${site.name}`);
                }
            } else {
                console.log(`- Phase "Electrical and Plumbing Rough-in" not found for project: ${site.name}`);
            }
        }

        console.log('All updates complete.');
    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        if (db) await db.end();
    }
}

update();
