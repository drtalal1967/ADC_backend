const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatest() {
  const rs = await prisma.reminder.findMany({ 
    orderBy: { createdAt: 'desc' }, 
    take: 5,
    include: { recipient: { select: { email: true } } }
  });
  
  console.log('\n--- LATEST 5 REMINDERS ---');
  rs.forEach(r => {
    console.log(`ID: ${r.id} | Title: ${r.title} | Method: ${r.method} | Email: ${r.recipient?.email || 'N/A'}`);
  });
}
checkLatest().finally(() => prisma.$disconnect());
