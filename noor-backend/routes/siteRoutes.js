const express = require('express');
const taskController = require('../controllers/taskController');
const siteController = require('../controllers/siteController');
const uploadController = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Upload Route
router.post('/upload', verifyToken, uploadController.uploadMiddleware, uploadController.uploadFile);

// Admin routes - Sites
router.get('/sites', verifyToken, siteController.getAllSites);
router.post('/sites', verifyToken, siteController.createSite);
router.get('/sites/:id', verifyToken, siteController.getSiteWithPhases);
router.get('/sites/:siteId/files', verifyToken, siteController.getSiteFiles); // New Files Route
router.post('/sites/:siteId/files', verifyToken, siteController.addSiteFile); // Upload File Record
router.put('/sites/:id', verifyToken, siteController.updateSite);
router.delete('/sites/:id', verifyToken, siteController.deleteSite);

// Phases
router.get('/sites/:siteId/phases', verifyToken, siteController.getPhases);
router.post('/phases', verifyToken, siteController.addPhase);
router.put('/phases/:id', verifyToken, siteController.updatePhase);
router.put('/phases/:id/assign', verifyToken, siteController.assignEmployeeToPhase);
router.delete('/phases/:id', verifyToken, siteController.deletePhase);

// Tasks
router.get('/tasks', verifyToken, siteController.getAllTasks);
router.post('/tasks', verifyToken, siteController.addTask);
router.put('/tasks/:id', verifyToken, taskController.updateTask);
router.delete('/tasks/:id', verifyToken, siteController.deleteTask);

// Employee routes
router.get('/employees', verifyToken, siteController.getEmployees);
router.post('/employees', verifyToken, siteController.createEmployee);
router.get('/employees', verifyToken, siteController.getEmployees);
router.post('/employees', verifyToken, siteController.createEmployee);
router.put('/employees/:id', verifyToken, siteController.updateEmployee);
router.delete('/employees/:id', verifyToken, siteController.deleteEmployee);
router.get('/sites/assigned', verifyToken, siteController.getAssignedSites);
router.get('/tasks/assigned', verifyToken, siteController.getAssignedTasks);
router.put('/tasks/:id/status', verifyToken, siteController.updateTaskStatus);

// Employee Tasks
router.get('/employee/dashboard-stats', verifyToken, siteController.getEmployeeDashboardStats);
router.get('/employee/phases', verifyToken, siteController.getEmployeePhases);
router.get('/employee/profile', verifyToken, siteController.getEmployeeProfile);
router.put('/employee/profile', verifyToken, siteController.updateEmployeeProfile);
router.get('/employee/tasks', verifyToken, siteController.getEmployeeTasks);
router.get('/tasks/:taskId', verifyToken, siteController.getTaskDetails);
router.post('/tasks/:taskId/updates', verifyToken, taskController.addTaskUpdate);
router.post('/tasks/:taskId/todos', verifyToken, taskController.addTodo);
router.put('/todos/:todoId/toggle', verifyToken, taskController.toggleTodo);
router.post('/tasks/:taskId/messages', verifyToken, taskController.sendTaskMessage);
router.put('/tasks/:taskId/complete', verifyToken, taskController.completeTask);
router.put('/tasks/:taskId/approve', verifyToken, taskController.approveTask);
router.put('/tasks/:taskId/reject', verifyToken, taskController.rejectTask);
router.put('/tasks/:taskId/assign', verifyToken, taskController.toggleTaskAssignment);

// Stage Progress Routes
router.get('/phases/:id/details', verifyToken, siteController.getPhaseDetails);
router.post('/phases/:id/todos', verifyToken, siteController.addPhaseTodo);
router.put('/phases/todos/:todoId/toggle', verifyToken, siteController.togglePhaseTodo);
router.post('/phases/:id/updates', verifyToken, siteController.addPhaseUpdate);
router.put('/phases/:id/complete', verifyToken, siteController.completePhase);
router.put('/phases/:id/approve', verifyToken, siteController.approvePhase);
router.put('/phases/:id/reject', verifyToken, siteController.rejectPhase);
router.post('/phases/:id/messages', verifyToken, siteController.sendPhaseMessage);

// Notifications
router.get('/notifications', verifyToken, siteController.getNotifications);
router.put('/notifications/:id/read', verifyToken, siteController.markNotificationRead);

// Material Routes
const materialController = require('../controllers/materialController');
router.post('/materials', verifyToken, materialController.createMaterialRequest); // Create
router.get('/sites/:siteId/materials', verifyToken, materialController.getMaterialRequests); // Get for site
router.get('/materials', verifyToken, materialController.getAllMaterialRequests); // Get all (Admin)
router.put('/materials/:id/status', verifyToken, materialController.updateMaterialRequestStatus); // Approve/Reject
router.put('/materials/:id/received', verifyToken, materialController.markMaterialReceived); // Mark Received

// Transaction Routes
const transactionController = require('../controllers/transactionController');
router.get('/sites/:projectId/transactions', verifyToken, transactionController.getProjectTransactions);
router.post('/sites/:projectId/transactions', verifyToken, transactionController.addTransaction);
router.put('/phases/:phaseId/budget', verifyToken, transactionController.updatePhaseBudget);
router.get('/sites/:projectId/phases/financials', verifyToken, transactionController.getPhaseFinancials);

module.exports = router;
