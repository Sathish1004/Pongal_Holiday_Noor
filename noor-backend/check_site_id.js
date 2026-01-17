const db = require('./config/db');

async function checkSiteInfo() {
    try {
        console.log('--- Checking Sites ---');
        const [sites] = await db.query("SELECT id, name FROM sites WHERE name LIKE '%Chennai%'");
        console.log('Sites found:', JSON.stringify(sites, null, 2));

        if (sites.length > 0) {
            const siteId = sites[0].id;
            console.log(`--- Checking Files for Site ID: ${siteId} ---`);
            const [files] = await db.query(`
                SELECT tm.id, tm.type, tm.content 
                FROM task_messages tm
                JOIN tasks t ON tm.task_id = t.id
                JOIN phases p ON t.phase_id = p.id
                WHERE p.site_id = ? AND tm.type != 'text'
            `, [siteId]);
            console.log('Files found:', JSON.stringify(files, null, 2));
        } else {
            console.log('No site named Chennai found. Listing all sites:');
            const [allSites] = await db.query("SELECT id, name FROM sites");
            console.log(JSON.stringify(allSites, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSiteInfo();
