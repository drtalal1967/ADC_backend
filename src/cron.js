const cron = require('node-cron');
const leaveService = require('./services/leave.service');
const reminderService = require('./services/reminder.service');
const { sendReminderEmail } = require('./services/email.service');

const initCron = () => {
  // ─── 1. Monthly Leave Auto-Update (1st of every month at 00:00) ───
  cron.schedule('0 0 1 * *', async () => {
    try {
      await leaveService.runMonthlyAutoUpdate();
      console.log('Cron: Monthly leave update completed.');
    } catch (error) {
      console.error('Cron Error: Monthly leave update failed:', error);
    }
  });

  // ─── 2. Daily Reminder Email Blast (Every day at 8:00 AM) ───
  cron.schedule('0 8 * * *', async () => {
    console.log('Cron: Running daily reminder email check...');
    try {
      const unsent = await reminderService.getUnsentEmailReminders();
      console.log(`Cron: Found ${unsent.length} unsent reminder(s) to email.`);

      for (const reminder of unsent) {
        try {
          // Determine recipient: assigned employee's email OR admin fallback
          let recipientEmail = process.env.SMTP_ADMIN;
          if (reminder.recipient?.email) {
            recipientEmail = reminder.recipient.email;
          }

          const sent = await sendReminderEmail(recipientEmail, reminder);

          if (sent) {
            await reminderService.markReminderSent(reminder.id);
            console.log(`Cron: Email sent for reminder ID ${reminder.id} to ${recipientEmail}`);
          }
        } catch (innerErr) {
          console.error(`Cron: Failed to process reminder ID ${reminder.id}:`, innerErr.message);
        }
      }
    } catch (error) {
      console.error('Cron Error: Daily email reminder job failed:', error);
    }
  });

  console.log('Cron: Monthly leave update scheduled (1st of every month).');
  console.log('Cron: Daily reminder email scheduled (every day at 8:00 AM).');
};

module.exports = { initCron };

