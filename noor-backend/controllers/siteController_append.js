
// Get all files for a site (Admin)
exports.getSiteFiles = async (req, res) => {
    try {
        const { siteId } = req.params;
        const [files] = await db.query(`
            SELECT 
                tm.id, 
                tm.content as url, 
                tm.type, 
                tm.created_at, 
                tm.task_id,
                t.name as task_name,
                p.name as phase_name,
                e.name as uploaded_by
            FROM task_messages tm
            JOIN tasks t ON tm.task_id = t.id
            JOIN phases p ON t.phase_id = p.id
            LEFT JOIN employees e ON tm.sender_id = e.id
            WHERE p.site_id = ? 
            AND tm.type IN ('image', 'video', 'audio', 'document')
            ORDER BY tm.created_at DESC
        `, [siteId]);

        res.json({ files });
    } catch (error) {
        console.error('Error fetching site files:', error);
        res.status(500).json({ message: 'Error fetching site files' });
    }
};
