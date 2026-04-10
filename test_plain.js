require('dotenv').config();
const nodemailer = require('nodemailer');

async function testPlain() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  console.log('Sending pure plain text email exactly like Webmail...');
  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM, // Exact same as webmail (no name attached)
    to: 'lightlabcreation@gmail.com',
    subject: 'testing',
    text: 'hgf' // exact string sent from webmail
  });

  console.log('Accepted by server:', result.accepted);
}
testPlain().catch(console.error);
