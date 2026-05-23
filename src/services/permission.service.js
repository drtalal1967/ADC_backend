const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOWED_MODULES = [
  'dashboard',
  'lab_cases',
  'expenses',
  'laboratories',
  'vendors',
  'financials',
  'lab_case_financials',
  'payments',
  'employees',
  'schedule',
  'leaves',
  'leaves_all',
  'leave_balance',
  'reports',
  'reminders',
  'documents',
  'work_schedule',
  'salaries',
  'settings',
];

const getRolePermissions = async (roleId) => {
  return await prisma.permission.findMany({
    where: {
      roleId: parseInt(roleId),
      module: { in: ALLOWED_MODULES }
    },
    orderBy: { module: 'asc' }
  });
};

const updateRolePermissions = async (roleId, permissions) => {
  const cleanPermissions = permissions.filter(p => ALLOWED_MODULES.includes(p.module));

  return await prisma.$transaction(
    cleanPermissions.map((p) =>
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
