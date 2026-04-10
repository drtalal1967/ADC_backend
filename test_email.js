require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSend() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  // Test 1: Send to admin (same domain - alawidental.com)
  console.log('\n[Test 1] Sending to info@alawidental.com (same domain)...');
  const r1 = await transporter.sendMail({
    from: `"Dental Reminders" <${process.env.SMTP_FROM}>`,
    to: 'info@alawidental.com',
    subject: 'TEST: Reminder System Working - Same Domain',
    html: '<h2>Test email to admin inbox</h2><p>If you see this, email delivery works for same domain!</p>',
  });
  console.log('Result 1 - response:', r1.response);
  console.log('Result 1 - accepted:', r1.accepted);
  console.log('Result 1 - rejected:', r1.rejected);

  // Test 2: Send to Gmail again
  console.log('\n[Test 2] Sending to satyamgoswami8912@gmail.com (Gmail)...');
  const r2 = await transporter.sendMail({
    from: `"Dental Reminders" <${process.env.SMTP_FROM}>`,
    to: 'satyamgoswami8912@gmail.com',
    subject: 'TEST: Reminder from Al-Awi Dental #2',
    html: '<h2>Test Reminder Email</h2><p>Testing email delivery to Gmail</p>',
  });
  console.log('Result 2 - response:', r2.response);
  console.log('Result 2 - accepted:', r2.accepted);
  console.log('Result 2 - rejected:', r2.rejected);
}

testSend().catch(e => {
  console.error('\n=== ERROR ===', e.message);
  process.exit(1);
});
