const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkAnyPermission([
  { module: 'schedule', action: 'view' },
  { module: 'work_schedule', action: 'view' },
]), scheduleController.getSchedules);
router.post('/', checkPermission('schedule', 'create'), scheduleController.createSchedule);
router.post('/batch', checkPermission('schedule', 'create'), scheduleController.createManySchedules);
router.post('/send-email', checkAnyPermission([
  { module: 'schedule', action: 'export' },
  { module: 'schedule', action: 'create' },
  { module: 'schedule', action: 'update' },
]), scheduleController.sendScheduleEmails);
router.put('/:id', checkPermission('schedule', 'update'), scheduleController.updateSchedule);
router.delete('/:id', checkPermission('schedule', 'delete'), scheduleController.deleteSchedule);

module.exports = router;
