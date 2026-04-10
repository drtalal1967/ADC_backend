const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getRolePermissions = async (roleId) => {
  return await prisma.permission.findMany({
    where: { roleId: parseInt(roleId) }
  });
};

const updateRolePermissions = async (roleId, permissions) => {
  return await prisma.$transaction(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: {
          roleId_module: {
            roleId: parseInt(roleId),
            module: p.module,
          },
        },
        update: {
          canView: p.canView,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
          canExport: p.canExport,
        },
        create: {
          roleId: parseInt(roleId),
          module: p.module,
          canView: p.canView,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
          canExport: p.canExport,
        },
      })
    )
  );
};

const getAllRoles = async () => {
    return await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        }
    });
};

module.exports = {
  getRolePermissions,
  updateRolePermissions,
  getAllRoles
};
