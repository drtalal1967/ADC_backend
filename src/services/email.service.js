const nodemailer = require('nodemailer');

// Create SSL transporter using client's SMTP credentials
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // Port 465 = SSL/TLS
    name: 'alawidental.com', // Fix EHLO for localhost originating emails
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs on custom mail servers
    },
  });
};

/**
 * Send a reminder email.
 * @param {string} to - Recipient email address
 * @param {object} reminder - Reminder object with title, description, dueAt, branch, method
 */
const sendReminderEmail = async (to, reminder) => {
  try {
    const transporter = createTransporter();

    const dueDate = reminder.dueAt
      ? new Date(reminder.dueAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric'
        })
      : 'Not specified';

    const notifyDate = reminder.notifyAt
      ? new Date(reminder.notifyAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric'
        })
      : 'Not set';

    const category = reminder.body || reminder.title || 'General Reminder';
    const title = reminder.title || category;

    const severityColor =
      reminder.severity === 'critical' ? '#ef4444' :
      reminder.severity === 'warning'  ? '#f59e0b' : '#3b82f6';

    const severityLabel =
      reminder.severity === 'critical' ? 'CRITICAL' :
      reminder.severity === 'warning'  ? 'WARNING'  : 'INFO';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reminder - ${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a6de8,#0f4bbf);padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Al-Awi Dental Center</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">🔔 Reminder Notification</h1>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:${severityColor};color:#ffffff;font-size:10px;font-weight:900;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">${severityLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Block -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Reminder Type</p>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;">${category}</p>
              <h2 style="margin:0;font-size:20px;color:#1e293b;font-weight:800;line-height:1.3;">${title}</h2>
            </td>
          </tr>

          <!-- Details Grid -->
          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px;font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">📅 Due Date</p>
                    <p style="margin:0;font-size:15px;color:#1e293b;font-weight:800;">${dueDate}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px;font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">🔔 Notify On</p>
                    <p style="margin:0;font-size:15px;color:#1e293b;font-weight:800;">${notifyDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Branch -->
          ${reminder.branch && reminder.branch !== 'All Branches' ? `
          <tr>
            <td style="padding:0 32px 16px;">
              <p style="margin:0;font-size:12px;color:#64748b;font-weight:600;">🏢 Branch: <strong>${reminder.branch}</strong></p>
            </td>
          </tr>` : ''}

          <!-- Description -->
          ${reminder.description ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background:#f0f9ff;border-left:3px solid #3b82f6;border-radius:8px;padding:16px;">
                <p style="margin:0 0 6px;font-size:10px;color:#3b82f6;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Description</p>
                <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">${reminder.description}</p>
              </div>
            </td>
          </tr>` : ''}

          <!-- Attachment -->
          ${reminder.attachmentUrl ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background:#ffffff;border:2px dashed #cbd5e1;border-radius:8px;padding:20px;text-align:center;">
                <p style="margin:0 0 12px;font-size:13px;color:#475569;font-weight:700;">📎 An important document is attached</p>
                <a href="${reminder.attachmentUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.5px;padding:12px 28px;border-radius:6px;box-shadow:0 4px 6px rgba(37,99,235,0.2);">
                  View Attached Document
                </a>
              </div>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                This is an automated reminder from <strong>Al-Awi Dental Center System</strong>.<br/>
                Sent from: ${process.env.SMTP_FROM}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Al-Awi Dental - Reminders" <${process.env.SMTP_FROM}>`,
      to,
      subject: `🔔 Reminder: ${title} — Due ${dueDate}`,
      html: htmlBody,
    });

    console.log(`[Email] Sent reminder "${title}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send reminder to ${to}:`, err.message);
    return false; // Never break the main flow
  }
};

module.exports = { sendReminderEmail };
