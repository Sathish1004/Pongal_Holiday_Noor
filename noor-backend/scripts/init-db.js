const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initDatabase() {
    try {
        const sqlPath = path.join(__dirname, 'setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon to get individual statements, filtering out empty ones
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (const statement of statements) {
            try {
                await db.query(statement);
                console.log('Executed statement successfully.');
            } catch (err) {
                // Ignore "table already exists" errors or similar if needed, 
                // but for now let's log them.
                console.error('Error executing statement:', err.message);
            }
        }

        console.log('Database initialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error initializing database:', error);
        process.exit(1);
    }
}

initDatabase();
