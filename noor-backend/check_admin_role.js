const db = require('./config/db');
require('dotenv').config();

const checkAdminUser = async () => {
    try {
        const [rows] = await db.query("SELECT id, name, email, role FROM employees WHERE email LIKE '%admin%' OR role LIKE '%admin%'");
        console.log('Admin Users found:', rows);
        process.exit();
    } catch (error) {
        console.error('Error fetching admin user:', error);
        process.exit(1);
    }
};

checkAdminUser();
