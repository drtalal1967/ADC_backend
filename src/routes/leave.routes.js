const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Leave Requests
router.get('/', leaveController.getAllLeaveRequests);
router.post('/apply', leaveController.applyLeave);
router.put('/:id/status', authorize('ADMIN', 'MANAGER'), leaveController.updateLeaveStatus);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), leaveController.deleteLeaveRequest);

// Leave Balances
router.get('/balances', leaveController.getLeaveBalances);
router.get('/balances/:employeeId', leaveController.getEmployeeBalance);
router.put('/balances/:employeeId', authorize('ADMIN', 'MANAGER'), leaveController.updateEmployeeBalances);
router.post('/balances/monthly-update', authorize('ADMIN'), leaveController.runMonthlyUpdate);

module.exports = router;
