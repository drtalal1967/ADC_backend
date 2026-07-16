const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utils/password.utils');
const prisma = new PrismaClient();

const hasEndDate = (value) => Boolean(value && value !== 'N/A' && !Number.isNaN(new Date(value).getTime()));

const getAllEmployees = async (options = {}) => {
  const includeFormer = options.includeFormer === 'true' || options.includeFormer === true || options.status === 'all';
  const requestedStatus = String(options.status || '').toLowerCase();
  const where = {};

  if (!includeFormer) {
    where.endDate = null;
    where.user = { isActive: true };
  } else if (requestedStatus === 'active') {
    where.endDate = null;
    where.user = { isActive: true };
  } else if (requestedStatus === 'former' || requestedStatus === 'inactive') {
    where.OR = [
      { endDate: { not: null } },
      { status: { in: ['INACTIVE', 'TERMINATED'] } },
      { user: { isActive: false } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { 
      user: { 
        include: { role: true }
      },
      documents: true
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
  return employees.map(emp => ({
    ...emp,
    user: emp.user ? {
      ...emp.user,
      role: emp.user.role?.name || 'SECRETARY'
    } : null
  }));
};

const getEmployeeById = async (id) => {
  const emp = await prisma.employee.findUnique({
    where: { id: parseInt(id) },
    include: { 
      user: { 
        include: { role: true }
      },
      documents: true
    },
  });
  if (!emp) return null;
  return {
    ...emp,
    user: emp.user ? {
      ...emp.user,
      role: emp.user.role?.name || 'SECRETARY'
    } : null
  };
};

const createEmployee = async (employeeData) => {
  const {
    email, password, role,
    firstName, lastName, phone, dateOfBirth, gender, address,
    nationalId, profileImageUrl, scheduleColor, jobTitle, specialization, licenseNumber,
    licenseExpiry, visaExpiry, workPermitExpiry,
    employmentType, status, joiningDate, endDate, basicSalary, notes,
    documents
  } = employeeData;

  const hashedPassword = await hashPassword(password || 'Dental@123');

  return await prisma.$transaction(async (tx) => {
    const roleRecord = await tx.role.findUnique({ where: { name: role || 'ASSISTANT' } });
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        roleId: roleRecord?.id,
        isActive: roleRecord?.name === 'ADMIN' ? true : !hasEndDate(endDate),
      },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        nationalId,
        profileImageUrl,
        scheduleColor: scheduleColor || null,
        jobTitle,
        specialization,
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        visaExpiry: visaExpiry ? new Date(visaExpiry) : null,
        workPermitExpiry: workPermitExpiry ? new Date(workPermitExpiry) : null,
        employmentType,
        status: roleRecord?.name === 'ADMIN' ? (status || 'ACTIVE') : (hasEndDate(endDate) ? 'INACTIVE' : (status || 'ACTIVE')),
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        basicSalary: parseFloat(basicSalary || 0),
        notes,
      },
      include: { user: true, documents: true },
    });

    if (documents && Array.isArray(documents)) {
      for (const d of documents) {
        const docUrl = typeof d === 'object' ? d.fileUrl : d;
        if (!docUrl) continue;
        const fileName = docUrl.split('/').pop() || 'document';
        await tx.document.create({
          data: {
            title: `ID/Doc - ${firstName}`,
            fileName: fileName,
            fileUrl: docUrl,
            fileType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            category: 'ID',
            employeeId: employee.id
          }
        });
      }
    }
    return employee;
  });
};

const isValidDate = (val) => val && val !== 'N/A' && val !== '' && !isNaN(new Date(val).getTime());

const updateEmployee = async (id, employeeData) => {
  const {
    email, role, isActive,
    firstName, lastName, phone, dateOfBirth, gender, address,
    nationalId, profileImageUrl, scheduleColor, jobTitle, specialization, licenseNumber,
    licenseExpiry, visaExpiry, workPermitExpiry,
    employmentType, status, joiningDate, endDate, basicSalary, notes,
    documents
  } = employeeData;

  const empId = parseInt(id);
  const employee = await prisma.employee.findUnique({
    where: { id: empId },
    include: { user: { include: { role: true } } }
  });
  if (!employee) throw new Error('Employee not found');

  if (email || role || isActive !== undefined || endDate !== undefined) {
    const calculateIsActive = () => {
      if (isActive !== undefined) return isActive;
      const targetRole = role || employee.user?.role?.name;
      if (targetRole === 'ADMIN') return true;
      const targetEndDate = endDate !== undefined ? endDate : employee.endDate;
      return !hasEndDate(targetEndDate);
    };

    const updateData = {
      ...(email && { email }),
      isActive: calculateIsActive(),
    };

    if (role) {
      const roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (roleRecord) updateData.roleId = roleRecord.id;
    }

    await prisma.user.update({
      where: { id: employee.userId },
      data: updateData,
    });
  }

  const targetRole = role || employee.user?.role?.name;
  const targetHasEndDate = endDate !== undefined ? hasEndDate(endDate) : hasEndDate(employee.endDate);
  const statusUpdate = targetRole === 'ADMIN'
    ? (status || 'ACTIVE')
    : (endDate !== undefined ? (targetHasEndDate ? 'INACTIVE' : 'ACTIVE') : (status || undefined));
  const updatedEmployee = await prisma.employee.update({
    where: { id: empId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && phone !== '' && { phone }),
      ...(isValidDate(dateOfBirth) && { dateOfBirth: new Date(dateOfBirth) }),
      ...(gender && { gender }),
      ...(address !== undefined && { address: address || null }),
      ...(nationalId !== undefined && { nationalId: nationalId || null }),
      ...(profileImageUrl !== undefined && { profileImageUrl: profileImageUrl || null }),
      ...(scheduleColor !== undefined && { scheduleColor: scheduleColor || null }),
      ...(jobTitle && { jobTitle }),
      ...(specialization && { specialization }),
      ...(licenseNumber && { licenseNumber }),
      ...(isValidDate(licenseExpiry) ? { licenseExpiry: new Date(licenseExpiry) } : licenseExpiry === '' ? { licenseExpiry: null } : {}),
      ...(isValidDate(visaExpiry) ? { visaExpiry: new Date(visaExpiry) } : visaExpiry === '' ? { visaExpiry: null } : {}),
      ...(isValidDate(workPermitExpiry) ? { workPermitExpiry: new Date(workPermitExpiry) } : workPermitExpiry === '' ? { workPermitExpiry: null } : {}),
      ...(employmentType && { employmentType }),
      ...(statusUpdate && { status: statusUpdate }),
      ...(isValidDate(joiningDate) && { joiningDate: new Date(joiningDate) }),
      ...(endDate !== undefined && { endDate: isValidDate(endDate) ? new Date(endDate) : null }),
      ...(basicSalary !== undefined && basicSalary !== '' && { basicSalary: parseFloat(basicSalary) || 0 }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: { user: true, documents: true },
  });

  if (documents && Array.isArray(documents)) {
    const existingDocs = await prisma.document.findMany({ where: { employeeId: empId } });
    const existingUrls = existingDocs.map(d => d.fileUrl);

    for (const d of documents) {
      const docUrl = typeof d === 'object' ? d.fileUrl : d;
      if (!docUrl || existingUrls.includes(docUrl)) continue;
      const fileName = docUrl.split('/').pop() || 'document';
      await prisma.document.create({
        data: {
          title: `ID/Doc - ${updatedEmployee.firstName}`,
          fileName: fileName,
          fileUrl: docUrl,
          fileType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          category: 'ID',
          employeeId: updatedEmployee.id
        }
      });
    }
  }

  return updatedEmployee;
};

const updateScheduleColor = async (id, scheduleColor) => {
  return await prisma.employee.update({
    where: { id: parseInt(id) },
    data: { scheduleColor: scheduleColor || null },
    include: {
      user: {
        include: { role: true }
      },
      documents: true
    },
  });
};

const deleteEmployee = async (id) => {
  const empId = parseInt(id);
  const employee = await prisma.employee.findUnique({ 
    where: { id: empId },
    include: { user: true }
  });
  if (!employee) throw new Error('Employee not found');
  
  // 1. Check for historical dependencies (LabCases)
  const casesCount = await prisma.labCase.count({
    where: { dentistId: empId }
  });

  if (casesCount > 0) {
    throw new Error(`Cannot delete employee: They are linked to ${casesCount} clinical cases. Please deactivate them instead.`);
  }

  // 2. Transactional cleanup of other relations
  return await prisma.$transaction(async (tx) => {
    // Delete schedules
    await tx.schedule.deleteMany({ where: { employeeId: empId } });
    
    // Delete leave requests and balances
    await tx.leaveRequest.deleteMany({ where: { employeeId: empId } });
    await tx.leaveBalance.deleteMany({ where: { employeeId: empId } });
    
    // Delete reminders linked to the user
    await tx.reminder.deleteMany({ where: { userId: employee.userId } });

    // 3. Delete the user (cascades to employee)
    return await tx.user.delete({
      where: { id: employee.userId },
    });
  });
};

const getDentists = async () => {
    const employees = await prisma.employee.findMany({
        where: {
            user: { isActive: true }
        },
        include: { user: { include: { role: true } } },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
    });

    const dentists = employees.filter(emp => {
      const roleName = emp.user?.role?.name || '';
      const clinicalText = `${emp.jobTitle || ''} ${emp.specialization || ''}`.toLowerCase();
      const isActiveEmployee = !hasEndDate(emp.endDate);
      const isDentistRole = roleName === 'DENTIST';
      const isAdminDentist = roleName === 'ADMIN' && clinicalText.includes('dentist');
      return (isActiveEmployee && isDentistRole) || isAdminDentist;
    });

    return dentists.map(emp => ({
      ...emp,
      user: emp.user ? {
        ...emp.user,
        role: emp.user.role?.name || 'DENTIST'
      } : null
    }));
};

const importEmployees = async (employeesArray) => {
  const results = [];
  for (const emp of employeesArray) {
    try {
      // Map incoming fields to what createEmployee expects
      const formatted = {
        email: emp.email || emp.Email,
        password: emp.password || 'Dental@123',
        role: (emp.role || emp.Role || 'ASSISTANT').toUpperCase(),
        firstName: emp.firstName || emp.firstName || (emp.name || emp.Name || 'Unknown').split(' ')[0],
        lastName: emp.lastName || (emp.name || emp.Name || 'Unknown').split(' ').slice(1).join(' ') || '.',
        phone: emp.phone || emp.Phone,
        jobTitle: emp.jobTitle || emp["Job Title"] || emp.Job || "Staff",
        nationalId: emp.idNumber || emp["ID Number"] || emp.ID || `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        joiningDate: emp.startDate || emp["Start Date"] || new Date(),
        licenseExpiry: emp.licenseExpiry === 'N/A' ? null : emp.licenseExpiry,
        visaExpiry: emp.visaExpiry === 'N/A' ? null : emp.visaExpiry,
        workPermitExpiry: emp.workPermitExpiry === 'N/A' ? null : emp.workPermitExpiry,
        endDate: emp.endDate === 'N/A' ? null : (emp.endDate || null),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME'
      };

      // Check if user already exists to avoid duplicate errors
      const existingUser = await prisma.user.findUnique({ where: { email: formatted.email } });
      if (existingUser) continue;

      const result = await createEmployee(formatted);
      results.push(result);
    } catch (err) {
      console.error(`Failed to import employee:`, err.message);
    }
  }
  return { count: results.length };
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateScheduleColor,
  deleteEmployee,
  getDentists,
  importEmployees
};
