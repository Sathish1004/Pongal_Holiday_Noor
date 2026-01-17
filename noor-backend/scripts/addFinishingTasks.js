const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const NEW_TEMPLATES = [
    {
        phase: 'Plumbing Finishes', tasks: [
            'Plumbing finishing work', 'Outer plumbing pipeline', 'Inner plumbing pipeline',
            'Kitchen tap', 'Bathroom fittings', 'Outer area fittings', 'Overhead Water tank fixing and connection'
        ]
    },
    {
        phase: 'Electrical Finishes', tasks: [
            'Electrical finishing work', 'Switch box', 'MCB box', 'Light fittings'
        ]
    },
    {
        phase: 'Painting', tasks: [
            'Inner painting work', 'Patti 2 or 3 coats', 'Primer', 'Emulsion', 'Gril painting',
            'Main door polish', 'Windows and doors polishing or painting', 'Outer painting work',
            'Elevation', 'MS gate painting', 'Additional laser cut or other elevation element painting'
        ]
    },
    {
        phase: 'Tiles work', tasks: [
            'Both room wall and floor finish', 'Main floor finish', 'Kitchen wall', 'Elevation wall', 'Parking'
        ]
    },
    {
        phase: 'Granite and Staircase Work', tasks: [
            'Tabletop granite', 'Front step', 'Inner staircase', 'Paneling work'
        ]
    },
    {
        phase: 'Carpentry Finishes', tasks: [
            'Carpenter finishing work', 'Main door', 'Bedroom door', 'Bathroom door', 'Windows frame and shutter', 'All glasses fixing'
        ]
    },
    {
        phase: 'Optional Extras', tasks: [
            'Elevation grill or laser work', 'Main gate work', 'Outer stair handrails', 'MS or SS work'
        ]
    }
];

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
        const [lastOrderRow] = await db.query('SELECT MAX(order_num) as max_order FROM task_templates');
        let currentOrder = (lastOrderRow[0].max_order || 0) + 1;

        for (const section of NEW_TEMPLATES) {
            for (const taskName of section.tasks) {
                // Check if already in template
                const [existing] = await db.query('SELECT id FROM task_templates WHERE phase_name = ? AND task_name = ?', [section.phase, taskName]);
                if (existing.length === 0) {
                    await db.query('INSERT INTO task_templates (phase_name, task_name, order_num) VALUES (?, ?, ?)', [section.phase, taskName, currentOrder++]);
                }
            }
        }
        console.log('Templates updated.');

        console.log('Updating existing projects...');
        const [sites] = await db.query('SELECT id, name FROM sites');
        for (const site of sites) {
            console.log(`Processing site: ${site.name}`);
            let phaseOrder = 100; // Large number to ensure they go after existing ones

            for (const section of NEW_TEMPLATES) {
                // 1. Get or create phase
                let [phases] = await db.query('SELECT id FROM phases WHERE site_id = ? AND name = ?', [site.id, section.phase]);
                let phaseId;

                if (phases.length === 0) {
                    const [res] = await db.query('INSERT INTO phases (site_id, name, order_num) VALUES (?, ?, ?)', [site.id, section.phase, phaseOrder++]);
                    phaseId = res.insertId;
                } else {
                    phaseId = phases[0].id;
                }

                // 2. Add tasks
                for (const taskName of section.tasks) {
                    const [existingTask] = await db.query('SELECT id FROM tasks WHERE site_id = ? AND phase_id = ? AND name = ?', [site.id, phaseId, taskName]);
                    if (existingTask.length === 0) {
                        await db.query('INSERT INTO tasks (site_id, phase_id, name, status) VALUES (?, ?, ?, "Not Started")', [site.id, phaseId, taskName]);
                    }
                }
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
