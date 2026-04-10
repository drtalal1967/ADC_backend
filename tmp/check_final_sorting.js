const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinalSorting() {
    const payments = await prisma.payment.findMany({
        orderBy: [
          { paymentDate: 'desc' },
          { id: 'desc' }
        ],
        take: 10
    });

    console.log(JSON.stringify(payments, null, 2));
}

checkFinalSorting().then(() => prisma.$disconnect());
