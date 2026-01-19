const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const milestoneController = require('../controllers/milestoneController'); // NEW

// Middleware to verify Admin
const verifyAdmin = (req, res, next) => {
    // Basic role check - in production use proper JWT verification from middleware
    // For now assuming the request is authorized or handled by server.js main middleware
    next();
};

router.get('/dashboard-stats', verifyToken, isAdmin, adminController.getDashboardStats);
router.get('/approvals', verifyToken, isAdmin, adminController.getPendingApprovals);
router.get('/completed-tasks', verifyToken, isAdmin, adminController.getCompletedTasksStats);
router.get('/completed-tasks-list', verifyToken, isAdmin, adminController.getCompletedTasks);

// Milestone Routes
router.post('/milestones', verifyToken, isAdmin, milestoneController.createMilestone);
router.get('/sites/:siteId/milestones', verifyToken, isAdmin, milestoneController.getMilestonesBySite);
router.put('/milestones/:id', verifyToken, isAdmin, milestoneController.updateMilestone);
router.delete('/milestones/:id', verifyToken, isAdmin, milestoneController.deleteMilestone);

// Overall Report Route
const reportController = require('../controllers/reportController');
router.get('/overall-report', verifyToken, isAdmin, reportController.getOverallReport);



module.exports = router;
