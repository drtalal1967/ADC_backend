const express = require('express');
const reminderController = require('../controllers/reminder.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('reminders', 'canView'), reminderController.getMyReminders);
router.get('/notifications', authMiddleware, reminderController.getNotifications);
router.post('/', checkPermission('reminders', 'canCreate'), upload.single('file'), reminderController.createReminder);
router.put('/:id', checkPermission('reminders', 'canUpdate'), upload.single('file'), reminderController.updateReminder);
router.delete('/:id', checkPermission('reminders', 'canDelete'), reminderController.deleteReminder);

module.exports = router;
