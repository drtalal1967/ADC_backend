const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true, employee: true }
  });
  console.log(JSON.stringify(users.map(u => ({
    email: u.email,
    role: u.role?.name,
    jobTitle: u.employee?.jobTitle
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
