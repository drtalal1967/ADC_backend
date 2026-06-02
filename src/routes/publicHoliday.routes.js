const express = require('express');
const publicHolidayController = require('../controllers/publicHoliday.controller');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', publicHolidayController.getPublicHolidays);
router.post('/', checkPermission('leave_balance', 'update'), publicHolidayController.createPublicHoliday);
router.put('/:id', checkAnyPermission([{ module: 'leave_balance', action: 'update' }, { module: 'leave_balance', action: 'delete' }]), publicHolidayController.updatePublicHoliday);
router.delete('/:id', checkPermission('leave_balance', 'delete'), publicHolidayController.deletePublicHoliday);

module.exports = router;
