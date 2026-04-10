const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('leaves', 'canView'), leaveController.getAllLeaveRequests);
router.post('/', checkPermission('leaves', 'canCreate'), leaveController.applyLeave);
router.put('/:id/status', checkPermission('leaves', 'canUpdate'), leaveController.updateLeaveStatus);
router.delete('/:id', checkPermission('leaves', 'canDelete'), leaveController.deleteLeaveRequest);

module.exports = router;
