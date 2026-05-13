const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { authMiddleware, authorize, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Leave Requests
router.get('/', checkPermission('leaves', 'view'), leaveController.getAllLeaveRequests);
router.post('/apply', checkPermission('leaves', 'create'), leaveController.applyLeave);
router.put('/:id/status', authorize('ADMIN'), leaveController.updateLeaveStatus);
router.delete('/:id', checkPermission('leaves', 'delete'), leaveController.deleteLeaveRequest);

// Leave Balances
router.get('/balances', checkPermission('leave_balance', 'view'), leaveController.getLeaveBalances);
router.get('/balances/:employeeId', checkPermission('leave_balance', 'view'), leaveController.getEmployeeBalance);
router.put('/balances/:employeeId', checkPermission('leave_balance', 'update'), leaveController.updateEmployeeBalances);
router.post('/balances/monthly-update', authorize('ADMIN'), leaveController.runMonthlyUpdate);

module.exports = router;
