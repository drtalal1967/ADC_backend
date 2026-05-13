const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const { sendWorkScheduleEmail } = require('./email.service');
const prisma = new PrismaClient();

const BAHRAIN_TIME_ZONE = 'Asia/Bahrain';
const BAHRAIN_OFFSET_HOURS = 3;

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
    weekday: 'short',
    hour12: false,
  }).formatToParts(date).reduce((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
    return parts;
  }, {});
};

const parseBahrainDateTime = (date, time = '00:00') => {
  if (!date || !time) return null;
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour = 0, minute = 0] = String(time).split(':').map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return new Date(`${date}T${time}`);
  }

  return new Date(Date.UTC(year, month - 1, day, hour - BAHRAIN_OFFSET_HOURS, minute, 0));
};

const toDateKey = (value) => {
  const parts = getBahrainParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatDateDisplay = (value) => {
  const key = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey(value);
  if (!key) return '';
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
};

const formatTime = (value) => {
  const parts = getBahrainParts(value);
  if (!parts) return '';
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${hour}:${parts.minute}`;
};

const createSchedule = async (scheduleData) => {
  const { employeeId, date, startTime, endTime, ...rest } = scheduleData;
  return await prisma.schedule.create({
    data: {
      ...rest,
      scheduleType: rest.scheduleType || "SHIFT",
      title: rest.title || "Work Shift",
      startTime: parseBahrainDateTime(date, startTime),
      endTime: parseBahrainDateTime(date, endTime),
      employee: { connect: { id: parseInt(employeeId) } },
    },
  });
};

const createManySchedules = async (batchData) => {
  let initialSchedules = [];

  if (Array.isArray(batchData)) {
    // Handling array of schedule objects (from current frontend)
    initialSchedules = batchData.map(s => ({
      employeeId: parseInt(s.employeeId),
      branch: s.branch,
      scheduleType: "SHIFT",
      title: "Work Shift",
      startTime: parseBahrainDateTime(s.date, s.startTime),
      endTime: parseBahrainDateTime(s.date, s.endTime),
    }));
  } else {
    // Handling range-based logic (as requested by user)
    const { employeeId, branch, startDate, endDate, selectedDays, startTime, endTime } = batchData;
    const current = new Date(startDate);
    const end = new Date(endDate);
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (current <= end) {
      const dayName = WEEKDAYS[current.getDay()];
      if (selectedDays.includes(dayName)) {
        const dateStr = current.toISOString().split('T')[0];
        initialSchedules.push({
          employeeId: parseInt(employeeId),
          branch,
          scheduleType: "SHIFT",
          title: "Work Shift",
          startTime: parseBahrainDateTime(dateStr, startTime),
          endTime: parseBahrainDateTime(dateStr, endTime),
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  if (initialSchedules.length === 0) return { count: 0 };

  // PREVENT DUPLICATES: Check for existing schedules at the same time for the same employee
  const employeeIds = [...new Set(initialSchedules.map(s => s.employeeId))];
  const startTimes = initialSchedules.map(s => s.startTime);

  const existing = await prisma.schedule.findMany({
    where: {
      employeeId: { in: employeeIds },
      startTime: { in: startTimes }
    }
  });

  const existingKeys = new Set(existing.map(e => `${e.employeeId}-${e.startTime.getTime()}`));
  const finalToCreate = initialSchedules.filter(s => !existingKeys.has(`${s.employeeId}-${s.startTime.getTime()}`));

  if (finalToCreate.length === 0) return { count: 0 };

  const result = await prisma.schedule.createMany({
    data: finalToCreate
  });

  return { count: result.count };
};

const getSchedules = async (query) => {
  const { start, end, startDate, endDate, employeeId, month } = query;
  const where = {};

  const finalStart = start || startDate;
  const finalEnd = end || endDate;

  if (month) {
    const [year, m] = month.split('-').map(Number);
    const dateStart = parseBahrainDateTime(`${year}-${String(m).padStart(2, '0')}-01`, '00:00');
    const dateEnd = parseBahrainDateTime(`${year}-${String(m).padStart(2, '0')}-${String(new Date(Date.UTC(year, m, 0)).getUTCDate()).padStart(2, '0')}`, '23:59'); // Last day of month
    where.startTime = {
      gte: dateStart,
      lte: dateEnd,
    };
  } else if (finalStart && finalEnd) {
    where.startTime = {
      gte: parseBahrainDateTime(finalStart, '00:00'),
      lte: parseBahrainDateTime(finalEnd, '23:59'),
    };
  }

  if (employeeId) {
    where.employeeId = parseInt(employeeId);
  }

  return await prisma.schedule.findMany({
    where,
    include: { employee: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
};

const updateSchedule = async (id, scheduleData) => {
  const { employeeId, date, startTime, endTime, ...rest } = scheduleData;
  const updateData = { ...rest };

  if (employeeId) updateData.employee = { connect: { id: parseInt(employeeId) } };

  // If date + startTime/endTime are provided, reconstruct them
  if (date && startTime) updateData.startTime = parseBahrainDateTime(date, startTime);
  else if (startTime) updateData.startTime = new Date(startTime);

  if (date && endTime) updateData.endTime = parseBahrainDateTime(date, endTime);
  else if (endTime) updateData.endTime = new Date(endTime);

  if (rest.branch) updateData.branch = rest.branch;

  return await prisma.schedule.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const deleteSchedule = async (id) => {
  return await prisma.schedule.delete({
    where: { id: parseInt(id) },
  });
};

const getTimeHours = (start, end) => {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / 3600000);
};

const normalizeBranch = (branch) => String(branch || '')
  .toLowerCase()
  .replace(/\s+branch$/, '')
  .trim();

const getEmployeeName = (employee) => `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee';

const getEmployeeEmail = (employee) => employee?.user?.email || employee?.email || '';

const eachDateKey = (startKey, endKey) => {
  const dates = [];
  const current = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  while (current <= end) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const colorPalette = [
  { fill: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
  { fill: '#d1fae5', border: '#059669', text: '#064e3b' },
  { fill: '#ede9fe', border: '#7c3aed', text: '#4c1d95' },
  { fill: '#fef3c7', border: '#d97706', text: '#78350f' },
  { fill: '#cffafe', border: '#0891b2', text: '#155e75' },
  { fill: '#fae8ff', border: '#c026d3', text: '#701a75' },
  { fill: '#ecfccb', border: '#65a30d', text: '#3f6212' },
  { fill: '#e0e7ff', border: '#4f46e5', text: '#312e81' },
  { fill: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
  { fill: '#ccfbf1', border: '#0d9488', text: '#134e4a' },
  { fill: '#fce7f3', border: '#db2777', text: '#831843' },
  { fill: '#dbeafe', border: '#2563eb', text: '#1e40af' },
];

const getPdfColor = (employeeId, scheduleColor) => {
  const colorKeys = ['sky', 'emerald', 'violet', 'amber', 'cyan', 'fuchsia', 'lime', 'indigo', 'orange', 'teal', 'pink', 'blue'];
  const savedIndex = colorKeys.indexOf(scheduleColor);
  if (savedIndex >= 0) return colorPalette[savedIndex % colorPalette.length];
  const numericId = Number(employeeId);
  return colorPalette[(Number.isFinite(numericId) && numericId > 0 ? numericId - 1 : 0) % colorPalette.length];
};

const buildEmployeeScheduleRows = ({ employee, dates, schedules, leaves }) => {
  const leaveByDate = new Map();
  leaves.forEach((leave) => {
    eachDateKey(toDateKey(leave.startDate), toDateKey(leave.endDate)).forEach((dateKey) => {
      leaveByDate.set(dateKey, leave);
    });
  });

  return dates.flatMap((dateKey) => {
    const leave = leaveByDate.get(dateKey);
    if (leave) {
      return [{
        date: dateKey,
        day: new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
        type: `${String(leave.leaveType || 'Leave').replace(/_/g, ' ')} Leave`,
        startTime: '',
        endTime: '',
        branch: '',
        hours: 0,
        isLeave: true,
      }];
    }

    const daySchedules = schedules
      .filter((schedule) => toDateKey(schedule.startTime) === dateKey)
      .sort((a, b) => a.startTime - b.startTime);

    return daySchedules.map((schedule) => ({
      date: dateKey,
      day: new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
      type: schedule.title || 'Work Shift',
      startTime: formatTime(schedule.startTime),
      endTime: formatTime(schedule.endTime),
      branch: schedule.branch || '',
      hours: getTimeHours(schedule.startTime, schedule.endTime),
      isLeave: false,
    }));
  });
};

const drawEmployeeSchedulePdf = ({ employee, rows, startDate, endDate }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 34 });
  const chunks = [];
  const color = getPdfColor(employee.id, employee.scheduleColor);

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  let y = doc.page.margins.top;

  const drawHeader = () => {
    doc.roundedRect(left, y, contentWidth, 78, 12).fill('#1C3756');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('AL-ALAWI DENTAL CENTER', left + 22, y + 17, { characterSpacing: 1.4 });
    doc.fontSize(22).text('Work Schedule', left + 22, y + 34);
    doc.font('Helvetica').fontSize(10).fillColor('#dbeafe').text(`${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`, left + 22, y + 59);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text(getEmployeeName(employee), left + contentWidth - 280, y + 24, { width: 250, align: 'right' });
    doc.fillColor('#dbeafe').font('Helvetica').fontSize(10).text(getEmployeeEmail(employee), left + contentWidth - 280, y + 48, { width: 250, align: 'right' });
    y += 98;
  };

  const drawSummary = () => {
    doc.roundedRect(left, y, contentWidth, 38, 10).fill('#f8fafc').stroke('#e5e7eb');
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('LEAVE DAYS IN RANGE', left + 18, y + 10);
    doc.fillColor('#be123c').fontSize(15).text(String(rows.filter(row => row.isLeave).length), left + 18, y + 21);
    y += 56;
  };

  const drawTableHeader = () => {
    const headers = ['Day', 'Date', 'Schedule', 'Time', 'Branch', 'Hours'];
    const widths = [54, 78, 265, 110, 120, 70];
    let x = left;
    doc.fillColor('#f1f5f9').rect(left, y, contentWidth, 24).fill();
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8);
    headers.forEach((header, index) => {
      doc.text(header.toUpperCase(), x + 8, y + 8, { width: widths[index] - 16 });
      x += widths[index];
    });
    y += 24;
  };

  const addPageIfNeeded = () => {
    if (y <= doc.page.height - doc.page.margins.bottom - 28) return;
    doc.addPage();
    y = doc.page.margins.top;
    drawTableHeader();
  };

  drawHeader();
  drawSummary();
  drawTableHeader();

  if (!rows.length) {
    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(14).text('No schedule found in this date range.', left, y + 18, { width: contentWidth, align: 'center' });
  }

  rows.forEach((row) => {
    addPageIfNeeded();
    const rowColor = row.isLeave ? { fill: '#fff1f2', border: '#f43f5e', text: '#9f1239' } : color;
    const rowHeight = 28;
    doc.fillColor(rowColor.fill).rect(left, y, contentWidth, rowHeight).fill();
    doc.fillColor(rowColor.border).rect(left, y, 4, rowHeight).fill();
    doc.strokeColor('#ffffff').lineWidth(1).moveTo(left, y + rowHeight).lineTo(left + contentWidth, y + rowHeight).stroke();

    const values = [
      row.day,
      formatDateDisplay(row.date),
      row.type,
      row.isLeave ? 'On Leave' : `${row.startTime} - ${row.endTime}`,
      row.branch || '-',
      row.isLeave ? '-' : row.hours.toFixed(2),
    ];
    const widths = [54, 78, 265, 110, 120, 70];
    let x = left;
    values.forEach((value, index) => {
      doc.fillColor(index === 2 ? rowColor.text : '#0f172a')
        .font(index === 2 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(index === 2 ? 10 : 9)
        .text(String(value), x + 8, y + 9, { width: widths[index] - 16, ellipsis: true });
      x += widths[index];
    });

    y += rowHeight;
  });

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
    .text('Generated by Al-Alawi Dental Center System', left, doc.page.height - 26, { width: contentWidth, align: 'center' });
  doc.end();
});

const sendScheduleEmails = async (payload = {}) => {
  const startDate = payload.startDate || payload.start;
  const endDate = payload.endDate || payload.end;
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  const startKey = toDateKey(`${startDate}T00:00:00`);
  const endKey = toDateKey(`${endDate}T00:00:00`);
  if (!startKey || !endKey || startKey > endKey) {
    throw new Error('Invalid schedule date range');
  }

  const dateKeys = eachDateKey(startKey, endKey);
  if (dateKeys.length > 120) {
    throw new Error('Date range is too long. Please select 120 days or less.');
  }

  const mode = payload.mode || 'all';
  const selectedEmployeeId = payload.employeeId ? parseInt(payload.employeeId, 10) : null;
  const selectedBranch = payload.branch || 'All Branches';

  const employeeWhere = {
    status: 'ACTIVE',
    user: { isActive: true },
  };
  if (mode === 'employee' && selectedEmployeeId) employeeWhere.id = selectedEmployeeId;

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: { user: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  const schedules = await prisma.schedule.findMany({
    where: {
      startTime: {
        gte: new Date(`${startKey}T00:00:00`),
        lte: new Date(`${endKey}T23:59:59`),
      },
      ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
    },
    include: { employee: { include: { user: true } } },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: new Date(`${endKey}T00:00:00`) },
      endDate: { gte: new Date(`${startKey}T00:00:00`) },
      ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
    },
    include: { employee: { include: { user: true } } },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  });

  const branchValue = normalizeBranch(selectedBranch);
  const schedulesForBranch = (items) => selectedBranch === 'All Branches'
    ? items
    : items.filter((schedule) => normalizeBranch(schedule.branch) === branchValue);

  const activeEmployeeIds = new Set([
    ...schedulesForBranch(schedules).map((schedule) => schedule.employeeId),
    ...(selectedBranch === 'All Branches' ? leaves.map((leave) => leave.employeeId) : []),
  ].map(String));

  const candidates = employees.filter((employee) => {
    if (mode === 'employee') return true;
    return activeEmployeeIds.has(String(employee.id));
  });

  const result = { sent: 0, skipped: [], failed: [] };

  for (const employee of candidates) {
    const email = getEmployeeEmail(employee);
    if (!email) {
      result.skipped.push({ employeeId: employee.id, employeeName: getEmployeeName(employee), reason: 'Missing email' });
      continue;
    }

    const employeeSchedules = schedulesForBranch(schedules.filter((schedule) => schedule.employeeId === employee.id));
    const employeeLeaves = leaves.filter((leave) => leave.employeeId === employee.id);
    const rows = buildEmployeeScheduleRows({
      employee,
      dates: dateKeys,
      schedules: employeeSchedules,
      leaves: employeeLeaves,
    });

    if (!rows.length) {
      result.skipped.push({ employeeId: employee.id, employeeName: getEmployeeName(employee), reason: 'No schedule in range' });
      continue;
    }

    const pdfBuffer = await drawEmployeeSchedulePdf({ employee, rows, startDate: startKey, endDate: endKey });
    const ok = await sendWorkScheduleEmail({
      to: email,
      employeeName: getEmployeeName(employee),
      startDate: formatDateDisplay(startKey),
      endDate: formatDateDisplay(endKey),
      pdfBuffer,
    });

    if (ok) result.sent += 1;
    else result.failed.push({ employeeId: employee.id, employeeName: getEmployeeName(employee), email });
  }

  return result;
};

module.exports = {
  createSchedule,
  createManySchedules,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  sendScheduleEmails,
};
