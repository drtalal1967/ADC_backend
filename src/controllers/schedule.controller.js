const scheduleService = require('../services/schedule.service');

const createSchedule = async (req, res, next) => {
  try {
    const role =
      req.user?.role?.name?.toUpperCase?.() ||
      req.user?.role?.toUpperCase?.() ||
      req.user?.roleName?.toUpperCase?.() ||
      "";

    if (!["ADMIN", "SECRETARY"].includes(role)) {
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
    const role =
      req.user?.role?.name?.toUpperCase?.() ||
      req.user?.role?.toUpperCase?.() ||
      req.user?.roleName?.toUpperCase?.() ||
      "";

    if (!["ADMIN", "SECRETARY"].includes(role)) {
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

    // MANDATORY VALIDATION
    if (!month && (!start && !end)) {
      return res.status(400).json({
        message: 'Month or (Start and End dates) are required'
      });
    }

    // ✅ DO NOT FILTER BY USER AT ALL
    const query = { ...req.query };

    // ❗ Remove any employee filter sent from frontend
    delete query.employeeId;

    const schedules = await scheduleService.getSchedules(query);

    const formattedSchedules = schedules.map(s => {
      const d = new Date(s.startTime);

      const date =
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      const formatTime = (dateObj) => {
        if (!dateObj) return '';
        const dt = new Date(dateObj);
        return String(dt.getHours()).padStart(2, '0') + ':' +
               String(dt.getMinutes()).padStart(2, '0');
      };

      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employee
          ? `${s.employee.firstName} ${s.employee.lastName}`
          : 'Unknown',
        branch: s.branch,
        title: s.title || 'Work Shift',
        shiftType: s.scheduleType || 'SHIFT',
        date,
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
    const role =
      req.user?.role?.name?.toUpperCase?.() ||
      req.user?.role?.toUpperCase?.() ||
      req.user?.roleName?.toUpperCase?.() ||
      "";

    if (!["ADMIN", "SECRETARY"].includes(role)) {
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
    const role =
      req.user?.role?.name?.toUpperCase?.() ||
      req.user?.role?.toUpperCase?.() ||
      req.user?.roleName?.toUpperCase?.() ||
      "";

    if (!["ADMIN", "SECRETARY"].includes(role)) {
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
