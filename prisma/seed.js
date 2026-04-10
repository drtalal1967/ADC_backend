const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const MODULES = [
  'dashboard',
  'lab_cases',
  'expenses',
  'vendors',
  'employees',
  'leaves',
  'payments',
  'schedules',
  'reminders',
  'documents',
  'finance',
  'permissions'
];

const ROLES = [
  { name: 'ADMIN', description: 'System Administrator - Full Access' },
  { name: 'MANAGER', description: 'Clinic Manager - Operational Oversight' },
  { name: 'SECRETARY', description: 'Clinic Secretary - Patient and Case Coordination' },
  { name: 'DENTIST', description: 'Specialist Dentist - Clinical focus' },
  { name: 'ASSISTANT', description: 'Dental Assistant - Operational Support' },
  { name: 'ACCOUNTANT', description: 'Financial Officer - Billing and Expenses' },
];

async function main() {
  console.log('🚀 Starting Robust RBAC Seed...');

  // 1. Seed Roles
  console.log('--- Initializing Roles ---');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    console.log(`- Role: ${r.name}`);
  }

  const allRoles = await prisma.role.findMany();

  // 2. Seed Permissions (Default Baseline)
  console.log('--- Configuring Permissions ---');
  for (const role of allRoles) {
    for (const module of MODULES) {
      const is_admin = role.name === 'ADMIN';
      const is_manager = role.name === 'MANAGER';
      const is_accountant = role.name === 'ACCOUNTANT';
      const is_staff = ['SECRETARY', 'DENTIST', 'ASSISTANT'].includes(role.name);

      const perms = {
        canView: is_admin || is_manager || (is_staff && ['lab_cases', 'vendors', 'leaves', 'dashboard', 'documents', 'schedules', 'reminders', 'employees'].includes(module)) || (is_accountant && ['lab_cases', 'expenses', 'vendors', 'payments', 'finance', 'dashboard', 'schedules', 'reminders', 'employees'].includes(module)),
        canCreate: is_admin || (is_manager && ['lab_cases', 'payments', 'schedules', 'reminders'].includes(module)) || (is_staff && ['lab_cases', 'leaves', 'documents'].includes(module)) || (is_accountant && ['expenses', 'vendors', 'payments'].includes(module)),
        canUpdate: is_admin || (is_manager && ['lab_cases', 'payments', 'schedules', 'reminders'].includes(module)) || (role.name === 'SECRETARY' && ['lab_cases'].includes(module)),
        canDelete: is_admin || (is_manager && ['lab_cases', 'payments'].includes(module)),
        canExport: is_admin || is_manager || is_accountant,
      };

      await prisma.permission.upsert({
        where: {
          roleId_module: {
            roleId: role.id,
            module: module,
          },
        },
        update: perms,
        create: {
          roleId: role.id,
          module: module,
          ...perms,
        },
      });
    }
    console.log(`- Permissions set for: ${role.name}`);
  }

  // 3. Seed Users & Link to Roles
  console.log('--- Seeding Users & Linking to Roles ---');
  const userPresets = [
    { email: 'drtalal@alawidental.com', password: 'drtalal@321', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    { email: 'manager@gmail.com', password: 'pass123', role: 'MANAGER', firstName: 'Manager', lastName: 'User' },
    { email: 'secretary@gmail.com', password: 'pass123', role: 'SECRETARY', firstName: 'Secretary', lastName: 'User' },
    { email: 'dentist@gmail.com', password: 'pass123', role: 'DENTIST', firstName: 'Dentist', lastName: 'User' },
    { email: 'assistant@gmail.com', password: 'pass123', role: 'ASSISTANT', firstName: 'Assistant', lastName: 'User' },
    { email: 'accountant@gmail.com', password: 'pass123', role: 'ACCOUNTANT', firstName: 'Accountant', lastName: 'User' },
  ];

  for (const u of userPresets) {
    const roleId = allRoles.find(r => r.name === u.role)?.id;
    if (!roleId) continue;

    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId },
      create: {
        email: u.email,
        passwordHash: hashedPassword,
        roleId,
      },
    });

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        joiningDate: new Date(),
        phone: '+973-00000000',
      },
      create: {
        userId: user.id,
        firstName: u.firstName,
        lastName: u.lastName,
        joiningDate: new Date(),
        phone: '+973-00000000',
      },
    });
    console.log(`- Synced user & employee: ${u.email} (${u.role})`);
  }

  console.log('✅ RBAC Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
