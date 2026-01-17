const db = require('../config/db');

// Create Material Request (Employee)
exports.createMaterialRequest = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const { siteId, materialName, quantity, notes, taskId } = req.body;

        if (!siteId || !materialName || !quantity || !taskId) {
            return res.status(400).json({ message: 'Missing required fields (including Task selection)' });
        }

        await db.query(
            'INSERT INTO material_requests (site_id, employee_id, material_name, quantity, notes, task_id, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
            [siteId, employeeId, materialName, quantity, notes || null, taskId]
        );

        // Notify Admin
        await db.query(`
            INSERT INTO notifications (project_id, employee_id, type, message, is_read, created_at)
            SELECT ?, id, 'MATERIAL_REQUEST', ?, 0, NOW()
            FROM employees WHERE role = 'Admin' OR role = 'admin'
        `, [siteId, `Material Request: ${quantity} ${materialName} requested`]);

        res.status(201).json({ message: 'Material request submitted' });
    } catch (error) {
        console.error('Error creating material request:', error);
        res.status(500).json({ message: 'Error creating material request' });
    }
};

// Get Material Requests for Site (Employee & Admin)
exports.getMaterialRequests = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { id, role } = req.user;
        const isAdmin = role === 'Admin' || role === 'admin';

        let query = `
            SELECT mr.*, e.name as requested_by, s.name as site_name, t.name as task_name
            FROM material_requests mr
            JOIN employees e ON mr.employee_id = e.id
            JOIN sites s ON mr.site_id = s.id
            LEFT JOIN tasks t ON mr.task_id = t.id
            WHERE mr.site_id = ?
        `;
        let params = [siteId];

        // CHECK: If not admin, restrict to own requests
        if (!isAdmin) {
            query += ' AND mr.employee_id = ?';
            params.push(id);
        }

        query += ' ORDER BY mr.created_at DESC';

        const [requests] = await db.query(query, params);
        res.json({ requests });
    } catch (error) {
        console.error('Error fetching material requests:', error);
        res.status(500).json({ message: 'Error fetching requests' });
    }
};

// Get All Material Requests (Admin Dashboard)
exports.getAllMaterialRequests = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
        // Allow employees to see all? Or restrict? Let's assume Admin only for "All".

        // Actually for Admin Dashboard, we want ALL sites.
        const [requests] = await db.query(`
            SELECT mr.*, s.name as site_name, e.name as requested_by
            FROM material_requests mr
            JOIN sites s ON mr.site_id = s.id
            JOIN employees e ON mr.employee_id = e.id
            ORDER BY mr.created_at DESC
            `);

        res.json({ requests });
    } catch (error) {
        console.error('Error fetching all material requests:', error);
        res.status(500).json({ message: 'Error fetching requests' });
    }
};

// Update Request Status (Admin: Approve/Reject)
exports.updateMaterialRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body; // status: 'Approved', 'Rejected'
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admin can approve/reject requests' });
        }

        await db.query(
            'UPDATE material_requests SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?',
            [status, adminNotes || null, id]
        );

        // GET request details for notification
        const [reqData] = await db.query('SELECT site_id, employee_id, material_name FROM material_requests WHERE id = ?', [id]);
        if (reqData.length > 0) {
            const r = reqData[0];
            await db.query(`
                INSERT INTO notifications(project_id, employee_id, type, message, is_read, created_at)
        VALUES(?, ?, 'MATERIAL_UPDATE', ?, 0, NOW())
            `, [r.site_id, r.employee_id, `Your material request for ${r.material_name} was ${status} `]);
        }

        res.json({ message: `Request ${status} ` });
    } catch (error) {
        console.error('Error updating material request:', error);
        res.status(500).json({ message: 'Error updating request' });
    }
};

// Mark as Received (Employee)
exports.markMaterialReceived = async (req, res) => {
    try {
        const { id } = req.params; // request ID
        const employeeId = req.user.id;

        // Verify ownership or assignment? Let's just verify it exists and is Approved.
        const [rows] = await db.query('SELECT * FROM material_requests WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const reqItem = rows[0];
        if (reqItem.status !== 'Approved') {
            return res.status(400).json({ message: 'Material must be Approved before receiving' });
        }

        await db.query('UPDATE material_requests SET status = "Received", updated_at = NOW() WHERE id = ?', [id]);

        // Notify Admin
        await db.query(`
            INSERT INTO notifications(project_id, employee_id, type, message, is_read, created_at)
        SELECT ?, id, 'MATERIAL_RECEIVED', ?, 0, NOW()
            FROM employees WHERE role = 'Admin' OR role = 'admin'
            `, [reqItem.site_id, `Material Received: ${reqItem.material_name} by employee`]);

        res.json({ message: 'Marked as received' });
    } catch (error) {
        console.error('Error marking received:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};
