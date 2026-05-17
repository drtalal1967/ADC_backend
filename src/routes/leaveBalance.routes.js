const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('leave_balance', 'view'), leaveController.getLeaveBalances);
router.get('/:employeeId', leaveController.getEmployeeBalance);
router.put('/:employeeId', checkPermission('leave_balance', 'update'), leaveController.updateEmployeeBalances);
router.delete('/:employeeId', checkPermission('leave_balance', 'delete'), leaveController.deleteLeaveBalance);
router.post('/monthly-update', checkPermission('leave_balance', 'update'), leaveController.runMonthlyUpdate);

module.exports = router;
