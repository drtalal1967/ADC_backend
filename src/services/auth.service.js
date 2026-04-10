const { PrismaClient } = require('@prisma/client');
const { comparePassword, hashPassword } = require('../utils/password.utils');
const { generateToken } = require('../utils/jwt.utils');

const prisma = new PrismaClient();

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { 
      employee: true,
      role: {
        include: { permissions: true }
      }
    },
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive');
  }

  const roleName = user.role?.name || 'SECRETARY';
  const permissions = user.role?.permissions || [];

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: roleName,
    permissions,
    employeeId: user.employee?.id,
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Derive display data from employee if available
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'System User';
  const branch = user.employee?.branch || 'Tubli Branch';
  const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: roleName,
      permissions,
      firstName: user.employee?.firstName || '',
      lastName: user.employee?.lastName || '',
      name,
      branch,
      avatar,
      profileImage: user.employee?.profileImageUrl,
      employeeId: user.employee?.id
    },
    token,
  };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
    throw new Error('Invalid current password');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: 'Password updated successfully' };
};

module.exports = {
  login,
  changePassword,
};
