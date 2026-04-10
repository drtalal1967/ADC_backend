require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Latest reminder
  const reminder = await prisma.reminder.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!reminder) { console.log('No reminders found'); return; }

  console.log('\n=== LATEST REMINDER ===');
  console.log('  ID:', reminder.id);
  console.log('  Title:', reminder.title);
  console.log('  Method:', JSON.stringify(reminder.method));
  console.log('  targetUserId:', reminder.targetUserId);
  console.log('  isSent:', reminder.isSent);
  console.log('  notifyAt:', reminder.notifyAt);
  console.log('  createdAt:', reminder.createdAt);

  if (reminder.targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: reminder.targetUserId },
      select: { id: true, email: true }
    });
    console.log('\n=== TARGET USER ===');
    console.log('  userId:', user?.id);
    console.log('  email:', user?.email);
  } else {
    console.log('\n  NO targetUserId — would send to SMTP_ADMIN =', process.env.SMTP_ADMIN);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
