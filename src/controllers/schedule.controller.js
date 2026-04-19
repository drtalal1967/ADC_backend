const scheduleService = require('../services/schedule.service');

const createSchedule = async (req, res, next) => {
  try {
    if (!["ADMIN", "SECRETARY"].includes(req.user.role?.name?.toUpperCase())) {
      return res.status(403).json({
        message: "You are not allowed to create schedules"
      });
    }

    const schedule = await scheduleService.createSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

const createManySchedules = async (req, res, next) => {
  try {
    if (!["ADMIN", "SECRETARY"].includes(req.user.role?.name?.toUpperCase())) {
      return res.status(403).json({
        message: "You are not allowed to create schedules"
      });
    }

    const result = await scheduleService.createManySchedules(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const { start, end, month } = req.query;

    // MANDATORY VALIDATION: Month or (Start and End)
    if (!month && (!start && !end)) {
      return res.status(400).json({ message: 'Month or (Start and End dates) are required' });
    }

    const query = { ...req.query };

   // ✅ Allow ALL users to see ALL schedules
// (No restriction needed)

    const schedules = await scheduleService.getSchedules(query);

    // SENIOR DEV RESPONSE FORMAT: title, startTime, endTime + local date
    const formattedSchedules = schedules.map(s => {
      const d = new Date(s.startTime);
      const date = d.getFullYear() + '-' + 
        String(d.getMonth() + 1).padStart(2, '0') + '-' + 
        String(d.getDate()).padStart(2, '0');

      const formatTime = (dateObj) => {
        if (!dateObj) return '';
        const d = new Date(dateObj);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      };

      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : 'Unknown',
        branch: s.branch,
        title: s.title || 'Work Shift',
        shiftType: s.scheduleType || 'SHIFT',
        date, // Crucial for Day/Week grouping in local time
        startTime: formatTime(s.startTime),
        endTime: formatTime(s.endTime)
      };
    });

    res.json(formattedSchedules);
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    if (!["ADMIN", "SECRETARY"].includes(req.user.role?.name?.toUpperCase())) {
      return res.status(403).json({
        message: "You are not allowed to update schedules"
      });
    }

    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    if (!["ADMIN", "SECRETARY"].includes(req.user.role?.name?.toUpperCase())) {
      return res.status(403).json({
        message: "You are not allowed to delete schedules"
      });
    }

    await scheduleService.deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchedule,
  createManySchedules,
  getSchedules,
  updateSchedule,
  deleteSchedule,
};
