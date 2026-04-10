const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendReminderEmail } = require('./email.service');

const createReminder = async (reminderData) => {
  const { userId, employeeId, dueDate, notifyDate, type, description, branch, method } = reminderData;

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const dueAt = parseDate(dueDate || reminderData.dueAt);
  if (!dueAt) {
    throw new Error('Due date is required and must be a valid date.');
  }

  let targetUserId = null;
  if (employeeId && employeeId !== 'General') {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      select: { userId: true },
    });
    if (employee) {
      targetUserId = employee.userId;
    }
  }

  const savedReminder = await prisma.reminder.create({
    data: {
      userId: parseInt(userId),
      targetUserId: targetUserId ? parseInt(targetUserId) : null,
      title: reminderData.title || type || 'Reminder',
      body: reminderData.body || null,
      description: description || '',
      severity: reminderData.severity || type || 'info',
      dueAt: dueAt,
      notifyAt: parseDate(notifyDate || reminderData.notifyAt),
      branch: branch || 'All Branches',
      method: method || 'In-App',
      reminderType: 'GENERAL',
      attachmentUrl: reminderData.attachmentUrl || null,
    },
  });

  // Send email if method is Email or Both
  const emailMethod = (method || 'In-App').toLowerCase();
  if (emailMethod === 'email' || emailMethod === 'both') {
    try {
      let recipientEmail = process.env.SMTP_ADMIN; // Default: admin inbox

      // If a specific employee is assigned, get their user email
      if (targetUserId) {
        const user = await prisma.user.findUnique({
          where: { id: parseInt(targetUserId) },
          select: { email: true },
        });
        if (user?.email) recipientEmail = user.email;
      }

      await sendReminderEmail(recipientEmail, savedReminder);
    } catch (emailErr) {
      console.error('[Reminder] Email send failed (non-blocking):', emailErr.message);
    }
  }

  return savedReminder;
};

const getReminders = async (userId, userRole) => {
  const isAdmin = userRole === 'admin';
  const whereClause = isAdmin ? {} : {
    OR: [
      { userId: parseInt(userId) },
      { targetUserId: parseInt(userId) },
      { targetUserId: null }
    ]
  };

  const manualReminders = await prisma.reminder.findMany({
    where: whereClause,
    include: {
      recipient: {
        select: {
          id: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  if (isAdmin) {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, firstName: true, lastName: true, 
        licenseExpiry: true, visaExpiry: true, workPermitExpiry: true 
      }
    });

    const systemAlerts = [];
    const today = new Date();
    const alertThreshold = 60;

    employees.forEach(emp => {
      const checks = [
        { date: emp.licenseExpiry, label: 'License' },
        { date: emp.visaExpiry, label: 'Visa' },
        { date: emp.workPermitExpiry, label: 'Work Permit' }
      ];

      checks.forEach(check => {
        if (check.date) {
          const daysLeft = Math.ceil((new Date(check.date) - today) / (1000 * 60 * 60 * 24));
          if (daysLeft <= alertThreshold) {
            systemAlerts.push({
              id: `sys-${emp.id}-${check.label}`,
              title: `${check.label} Expiry: ${emp.firstName}`,
              description: `${emp.firstName}'s ${check.label} expires in ${daysLeft} days (${check.date.toISOString().split('T')[0]})`,
              severity: daysLeft <= 15 ? 'critical' : 'warning',
              dueAt: check.date,
              branch: 'All Branches',
              isSystem: true,
              employeeId: emp.id,
              createdAt: today
            });
          }
        }
      });
    });

    // Combine and sort by createdAt DESC to show newest first
    return [...manualReminders, ...systemAlerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return manualReminders;
};

const getActiveNotifications = async (userId, userRole) => {
  const isAdmin = userRole === 'admin';
  const today = new Date();
  
  const whereClause = isAdmin ? {
    isRead: false,
    OR: [
      { notifyAt: { lte: today } },
      { notifyAt: null }
    ]
  } : {
    AND: [
      {
        OR: [
          { targetUserId: parseInt(userId) },
          { targetUserId: null }
        ]
      },
      { isRead: false },
      {
        OR: [
          { notifyAt: { lte: today } },
          { notifyAt: null }
        ]
      }
    ]
  };

  const manualNotifications = await prisma.reminder.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (isAdmin) {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, firstName: true, lastName: true, 
        licenseExpiry: true, visaExpiry: true, workPermitExpiry: true 
      }
    });

    const systemNotifications = [];
    for (const emp of employees) {
      const checks = [
        { date: emp.licenseExpiry, label: 'License' },
        { date: emp.visaExpiry, label: 'Visa' },
        { date: emp.workPermitExpiry, label: 'Work Permit' }
      ];

      for (const check of checks) {
        if (check.date) {
          const daysLeft = Math.ceil((new Date(check.date) - today) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 60) {
            systemNotifications.push({
              id: `sys-notif-${emp.id}-${check.label}`,
              title: `${check.label} Expiry Alert`,
              description: `${emp.firstName}'s ${check.label} expires on ${check.date.toISOString().split('T')[0]}`,
              severity: daysLeft <= 15 ? 'critical' : 'warning',
              createdAt: today,
              notifyAt: today,
              isRead: false,
              isSystem: true
            });
          }
        }
      }
    }
    return [...systemNotifications, ...manualNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return manualNotifications;
};

const updateReminder = async (id, reminderData) => {
  const { dueDate, notifyDate, type, description, branch, method, isRead, employeeId, body } = reminderData;
  const updateData = {};

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  if (reminderData.title) updateData.title = reminderData.title;
  if (body !== undefined) updateData.body = body;
  
  if (reminderData.severity) updateData.severity = reminderData.severity;
  else if (type) updateData.severity = type;

  if (description !== undefined) updateData.description = description;

  const dueAt = parseDate(dueDate || reminderData.dueAt);
  if (dueAt) updateData.dueAt = dueAt;

  const notifyAt = parseDate(notifyDate || reminderData.notifyAt);
  if (notifyAt) updateData.notifyAt = notifyAt;

  if (branch) updateData.branch = branch;
  if (method) updateData.method = method;
  if (isRead !== undefined) updateData.isRead = isRead;
  if (reminderData.attachmentUrl !== undefined) updateData.attachmentUrl = reminderData.attachmentUrl;

  if (employeeId !== undefined) {
    if (employeeId && employeeId !== 'General') {
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) },
        select: { userId: true },
      });
      updateData.targetUserId = employee ? employee.userId : null;
    } else {
      updateData.targetUserId = null;
    }
  }

  return await prisma.reminder.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const deleteReminder = async (id) => {
  return await prisma.reminder.delete({
    where: { id: parseInt(id) },
  });
};

/**
 * Get reminders that need email sending today (for cron job)
 * Filters: notifyAt <= today, isSent = false, method includes email
 */
const getUnsentEmailReminders = async () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return await prisma.reminder.findMany({
    where: {
      isSent: false,
      notifyAt: { lte: today },
      OR: [
        { method: 'Email' },
        { method: 'Both' },
      ],
    },
    include: {
      recipient: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Mark a reminder as sent in DB
 */
const markReminderSent = async (id) => {
  return await prisma.reminder.update({
    where: { id: parseInt(id) },
    data: { isSent: true },
  });
};

module.exports = {
  createReminder,
  getReminders,
  getActiveNotifications,
  updateReminder,
  deleteReminder,
  getUnsentEmailReminders,
  markReminderSent,
};
