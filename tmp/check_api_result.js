const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApiResult() {
    const payments = await prisma.payment.findMany({
        include: { 
          expense: { include: { vendor: true } }, 
          labCase: { include: { laboratory: true } },
          documents: true
        },
        orderBy: { paymentDate: 'desc' },
    });

    const results = payments.map(p => ({
        id: p.id,
        paymentType: p.paymentType,
        labCaseId: p.labCaseId,
        expenseId: p.expenseId
    }));
    
    console.log(JSON.stringify(results, null, 2));
}

checkApiResult().then(() => prisma.$disconnect());
