const reminderService = require('../services/reminder.service');
const documentService = require('../services/document.service');
const { uploadToImageKit } = require('../services/imagekit.service');

const createReminder = async (req, res, next) => {
  try {
    let attachmentUrl = null;

    if (req.file) {
      // Upload to ImageKit cloud
      const ikResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'dental-reminders'
      );
      attachmentUrl = ikResult.url;
    }

    const reminder = await reminderService.createReminder({
      ...req.body,
      userId: req.user.id,
      attachmentUrl,
    });


    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

const getMyReminders = async (req, res, next) => {
  try {
    const role = req.user.role?.name?.toLowerCase();
    const reminders = await reminderService.getReminders(req.user.id, role);
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const role = req.user.role?.name?.toLowerCase();
    const notifications = await reminderService.getActiveNotifications(req.user.id, role);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    let attachmentUrl = null;

    if (req.file) {
      // Upload to ImageKit cloud
      const ikResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'dental-reminders'
      );
      attachmentUrl = ikResult.url;
      updateData.attachmentUrl = attachmentUrl;
    }

    const reminder = await reminderService.updateReminder(req.params.id, updateData);


    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const deleteReminder = async (req, res, next) => {
  try {
    await reminderService.deleteReminder(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReminder,
  getMyReminders,
  getNotifications,
  updateReminder,
  deleteReminder,
};
