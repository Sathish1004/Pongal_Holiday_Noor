const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard-stats', verifyToken, isAdmin, adminController.getDashboardStats);
router.get('/approvals', verifyToken, isAdmin, adminController.getPendingApprovals);
router.get('/completed-tasks', verifyToken, isAdmin, adminController.getCompletedTasksStats);
router.get('/completed-tasks-list', verifyToken, isAdmin, adminController.getCompletedTasks);



module.exports = router;
