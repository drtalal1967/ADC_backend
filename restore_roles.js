const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allRoles = await prisma.role.findMany();
  const roleMap = {};
  allRoles.forEach(r => roleMap[r.name] = r.id);

  const restorations = [
    { email: 'drtalal@alawidental.com', role: 'ADMIN' },
    { email: 'manager@gmail.com', role: 'MANAGER' },
    { email: 'dentist@gmail.com', role: 'DENTIST' },
    { email: 'assistant@gmail.com', role: 'ASSISTANT' },
    { email: 'accountant@gmail.com', role: 'ACCOUNTANT' },
    { email: 'secretary@gmail.com', role: 'SECRETARY' },
    { email: 'demoUser@gmail.com', role: 'DENTIST' }
  ];

  for (const item of restorations) {
    const rid = roleMap[item.role];
    if (rid) {
      const user = await prisma.user.findUnique({ where: { email: item.email } });
      if (user) {
        await prisma.user.update({
          where: { email: item.email },
          data: { roleId: rid }
        });
        console.log(`Restored ${item.email} to ${item.role}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
