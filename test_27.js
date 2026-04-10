require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendReminderEmail } = require('./src/services/email.service');

async function testFailedReminder() {
  // get reminder 27
  const reminder = await prisma.reminder.findUnique({ where: { id: 27 }});
  console.log('Found reminder 27:', reminder);

  if (reminder) {
    let recipientEmail = process.env.SMTP_ADMIN;
    let userId = reminder.targetUserId;
    if (userId) {
       const user = await prisma.user.findUnique({ where: { id: userId }});
       if (user && user.email) {
         recipientEmail = user.email;
         console.log('Will send to target user email:', recipientEmail);
       }
    }
    
    // Attempt send
    const success = await sendReminderEmail(recipientEmail, reminder);
    console.log('sendReminderEmail success?', success);
  } else {
    console.log('Reminder 27 not found');
  }
}
testFailedReminder().catch(e => console.error(e)).finally(() => process.exit(0));

