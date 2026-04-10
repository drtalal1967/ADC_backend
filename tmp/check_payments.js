const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayments() {
  const payments = await prisma.payment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
        labCase: true,
        expense: true
    }
  });
  console.log(JSON.stringify(payments, null, 2));
}

checkPayments().then(() => prisma.$disconnect());
