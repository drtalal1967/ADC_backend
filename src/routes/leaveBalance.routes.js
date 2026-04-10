const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('leaves', 'canView'), leaveController.getLeaveBalances);
router.get('/:employeeId', checkPermission('leaves', 'canView'), leaveController.getEmployeeBalance);
router.put('/:employeeId', checkPermission('leaves', 'canUpdate'), leaveController.updateEmployeeBalances);
router.delete('/:employeeId', checkPermission('leaves', 'canDelete'), leaveController.deleteLeaveBalance);
router.post('/monthly-update', checkPermission('leaves', 'canUpdate'), leaveController.runMonthlyUpdate);

module.exports = router;
