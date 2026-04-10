const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('schedule', 'view'), scheduleController.getSchedules);
router.post('/', checkPermission('schedule', 'create'), scheduleController.createSchedule);
router.post('/batch', checkPermission('schedule', 'create'), scheduleController.createManySchedules);
router.put('/:id', checkPermission('schedule', 'update'), scheduleController.updateSchedule);
router.delete('/:id', checkPermission('schedule', 'delete'), scheduleController.deleteSchedule);

module.exports = router;
