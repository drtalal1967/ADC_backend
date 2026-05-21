const express = require('express');
const publicHolidayController = require('../controllers/publicHoliday.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', publicHolidayController.getPublicHolidays);
router.post('/', checkPermission('leave_balance', 'update'), publicHolidayController.createPublicHoliday);
router.put('/:id', checkPermission('leave_balance', 'update'), publicHolidayController.updatePublicHoliday);
router.delete('/:id', checkPermission('leave_balance', 'delete'), publicHolidayController.deletePublicHoliday);

module.exports = router;
