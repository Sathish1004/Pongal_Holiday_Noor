const db = require('./config/db');

async function verifyCompletionColumns() {
    try {
        console.log('Checking tasks table for completion columns...');
        const [rows] = await db.query("SHOW COLUMNS FROM tasks");
        const columns = rows.map(r => r.Field);

        const missing = [];
        if (!columns.includes('completed_by')) missing.push('completed_by');
        if (!columns.includes('completed_at')) missing.push('completed_at');
        if (!columns.includes('approved_by')) missing.push('approved_by');
        if (!columns.includes('approved_at')) missing.push('approved_at');

        if (missing.length > 0) {
            console.log('MISSING COLUMNS:', missing.join(', '));
        } else {
            console.log('ALL COMPLETION COLUMNS FOUND');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyCompletionColumns();
