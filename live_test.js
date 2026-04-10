require('dotenv').config();
const { sendReminderEmail } = require('./src/services/email.service');

async function triggerLiveTest() {
  const testEmail = 'lightlabcreation@gmail.com';
  console.log(`\n========================================`);
  console.log(`Starting Live Email Test for: ${testEmail}`);
  console.log(`========================================\n`);

  const mockReminder = {
    id: 999,
    title: 'Code Test Verification',
    body: 'This is a live test from the codebase',
    description: 'Verifying if the email.service.js successfully routes to lightlab!',
    severity: 'critical',
    dueAt: new Date(),
    notifyAt: new Date(),
    branch: 'Main Branch',
    method: 'Email',
    isRead: false,
    isSent: false
  };

  try {
    const success = await sendReminderEmail(testEmail, mockReminder);
    if (success) {
      console.log(`\n✅ SUCCESS: The code has successfully processed and sent the email!`);
      console.log(`Please check the inbox and SPAM folder for ${testEmail} right now.`);
    } else {
      console.log(`\n❌ FAILED: The code attempted to send but it failed internally.`);
    }
  } catch (e) {
    console.error('\n❌ ERROR encountered during send:', e.message);
  }
}

triggerLiveTest().finally(() => process.exit(0));
