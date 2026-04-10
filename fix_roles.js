const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    console.error('ADMIN role not found');
    return;
  }

  // Restore Dr. Talal and potentially other users
  const usersToFix = [
    'drtalal@alawidental.com',
    'admin@gmail.com' // Common dev admin
  ];

  for (const email of usersToFix) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { roleId: adminRole.id }
      });
      console.log(`Updated ${email} to ADMIN role.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
