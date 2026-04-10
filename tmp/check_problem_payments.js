const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificPayments() {
  const payments = await prisma.payment.findMany({
    where: { id: { in: [49, 50, 51, 52, 53, 54, 55] } },
    include: {
        labCase: true,
        expense: true
    }
  });
  console.log(JSON.stringify(payments, null, 2));
}

checkSpecificPayments().then(() => prisma.$disconnect());
