const scheduleService = require('../services/schedule.service');

const BAHRAIN_TIME_ZONE = 'Asia/Bahrain';

const getBahrainParts = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BAHRAIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
    return parts;
  }, {});
};

const formatBahrainDate = (value) => {
  const parts = getBahrainParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatBahrainTime = (value) => {
  const parts = getBahrainParts(value);
  if (!parts) return '';
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${hour}:${parts.minute}`;
};

const createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

const createManySchedules = async (req, res, next) => {
  try {
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
      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employee
          ? `${s.employee.firstName} ${s.employee.lastName}`
          : 'Unknown',
        employee: s.employee ? {
          id: s.employee.id,
          firstName: s.employee.firstName,
          lastName: s.employee.lastName,
          branch: s.employee.branch,
          jobTitle: s.employee.jobTitle,
          specialization: s.employee.specialization,
          scheduleColor: s.employee.scheduleColor,
        } : null,
        branch: s.branch,
        title: s.title || 'Work Shift',
        shiftType: s.scheduleType || 'SHIFT',
        date: formatBahrainDate(s.startTime),
        startTime: formatBahrainTime(s.startTime),
        endTime: formatBahrainTime(s.endTime)
      };
    });

    res.json(formattedSchedules);

  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const sendScheduleEmails = async (req, res, next) => {
  try {
    const result = await scheduleService.sendScheduleEmails(req.body);
    res.json(result);
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
  sendScheduleEmails,
};
