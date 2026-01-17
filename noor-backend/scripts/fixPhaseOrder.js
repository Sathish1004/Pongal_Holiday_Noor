const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Adjust path to point to the backend .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixPhaseOrder() {
    let db;
    try {
        console.log('Connecting to database...');
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Fetching sites...');
        const [sites] = await db.query('SELECT id, name FROM sites');

        for (const site of sites) {
            console.log(`Processing site: ${site.name} (ID: ${site.id})`);

            // Get phases ordered by their current order_num
            const [phases] = await db.query('SELECT id, name, order_num FROM phases WHERE site_id = ? ORDER BY order_num ASC', [site.id]);

            if (phases.length === 0) {
                console.log('  No phases found.');
                continue;
            }

            let newOrder = 1;
            let changesCount = 0;

            for (const phase of phases) {
                if (phase.order_num !== newOrder) {
                    await db.query('UPDATE phases SET order_num = ? WHERE id = ?', [newOrder, phase.id]);
                    changesCount++;
                }
                newOrder++;
            }

            if (changesCount > 0) {
                console.log(`  Updated ${changesCount} phases.`);
            } else {
                console.log('  Phases already in correct order.');
            }
        }

        console.log('All updates complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (db) await db.end();
    }
}

fixPhaseOrder();
