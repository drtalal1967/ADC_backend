require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendReminderEmail } = require('./src/services/email.service');

async function testFetchAndSend() {
  const targetUserId = 30; // user ID from the user's screenshot
  console.log(`Fetching user with ID ${targetUserId}...`);
  
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true }
  });
  
  console.log('User found:', user);

  if (user && user.email) {
    console.log(`Sending email to ${user.email}...`);
    // Create a mock reminder mimicking the structure
    const mockReminder = {
      title: 'for email',
      body: 'Work Permit',
      description: 'ok',
      dueDate: new Date(),
      notifyAt: new Date(),
      branch: 'Tubli Branch',
      severity: 'info'
    };
    const sent = await sendReminderEmail(user.email, mockReminder);
    console.log('Email send function returned:', sent);
  } else {
    console.log('No user email found to send to.');
  }

  await prisma.$disconnect();
}

testFetchAndSend().catch(e => console.error(e));
