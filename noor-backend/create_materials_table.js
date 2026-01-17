const db = require('./config/db');

async function createMaterialRequestsTable() {
    try {
        console.log('Validating Material Requests Table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS material_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                site_id INT NOT NULL,
                employee_id INT NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                quantity VARCHAR(100) NOT NULL,
                notes TEXT,
                status ENUM('Pending', 'Approved', 'Rejected', 'Received') DEFAULT 'Pending',
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `;

        await db.query(createTableQuery);

        console.log("✅ 'material_requests' table validated/created");
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createMaterialRequestsTable();
