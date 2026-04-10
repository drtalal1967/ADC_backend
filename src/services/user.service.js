const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updateProfile = async (userId, data) => {
  const { name, email, profileImageUrl } = data;

  // Split name into first and last
  const nameParts = name ? name.split(' ') : ['', ''];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return await prisma.$transaction(async (tx) => {
    // Update User email if provided
    if (email) {
      await tx.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    // Update Employee details
    const employee = await tx.employee.findUnique({
      where: { userId },
    });

    if (employee) {
      return await tx.employee.update({
        where: { id: employee.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(profileImageUrl && { profileImageUrl }),
        },
      });
    }
    return null;
  });
};

module.exports = {
  updateProfile,
};
