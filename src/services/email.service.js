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
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Al-Alawi Dental Center</p>
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
                This is an automated reminder from <strong>Al-Alawi Dental Center System</strong>.<br/>
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
      from: `"Al-Alawi Dental Center" <${process.env.SMTP_FROM}>`,
      to,
      subject: `Reminder: ${title} - Due ${dueDate}`,
      html: htmlBody,
    });

    console.log(`[Email] Sent reminder "${title}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send reminder to ${to}:`, err.message);
    return false; // Never break the main flow
  }
};


const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatLeaveDate = (value) => {
  if (!value) return 'Not specified';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
};

const getLeaveEmployeeName = (leaveRequest) => {
  const employee = leaveRequest.employee || {};
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
};

const buildLeaveDetailsHtml = (leaveRequest) => {
  const leaveType = escapeHtml((leaveRequest.leaveType || '').replace(/_/g, ' '));
  const employeeName = escapeHtml(getLeaveEmployeeName(leaveRequest));
  const reason = escapeHtml(leaveRequest.reason || 'Not provided');
  const reviewNotes = escapeHtml(leaveRequest.reviewNotes || 'No notes provided');
  const showReviewNotes = leaveRequest.status && leaveRequest.status !== 'PENDING';
  const detailCell = 'background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;';
  const labelStyle = 'margin:0 0 6px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;';
  const valueStyle = 'margin:0;color:#0f172a;font-size:15px;font-weight:800;line-height:1.45;';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:separate;border-spacing:0 12px;">
      <tr>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">Employee</p><p style="${valueStyle}">${employeeName}</p></td>
        <td width="4%"></td>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">Leave Type</p><p style="${valueStyle}">${leaveType}</p></td>
      </tr>
      <tr>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">From</p><p style="${valueStyle}">${escapeHtml(formatLeaveDate(leaveRequest.startDate))}</p></td>
        <td width="4%"></td>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">To</p><p style="${valueStyle}">${escapeHtml(formatLeaveDate(leaveRequest.endDate))}</p></td>
      </tr>
      <tr>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">Total Days</p><p style="${valueStyle}">${escapeHtml(leaveRequest.totalDays)}</p></td>
        <td width="4%"></td>
        <td width="48%" style="${detailCell}"><p style="${labelStyle}">Status</p><p style="${valueStyle}">${escapeHtml(leaveRequest.status || 'PENDING')}</p></td>
      </tr>
      <tr>
        <td colspan="3" style="${detailCell}"><p style="${labelStyle}">Reason</p><p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">${reason}</p></td>
      </tr>
      ${showReviewNotes ? `<tr><td colspan="3" style="${detailCell}"><p style="${labelStyle}">Review Notes</p><p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">${reviewNotes}</p></td></tr>` : ''}
    </table>`;
};

const buildLeaveEmailHtml = ({ title, eyebrow, intro, badgeText, badgeColor, leaveRequest, adminMessage }) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:34px 0;">
    <tr><td align="center" style="padding:0 14px;">
      <table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(28,55,86,0.14);">
        <tr>
          <td style="height:7px;background:linear-gradient(90deg,#2f5f9e 0%,#2f5f9e 55%,#f58220 55%,#f58220 100%);"></td>
        </tr>
        <tr>
          <td style="background:#1C3756;padding:30px 34px 34px;color:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:rgba(255,255,255,0.76);font-size:12px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;">Al-Alawi Dental Center</p>
                  <h1 style="margin:12px 0 0;font-size:30px;line-height:1.15;font-weight:900;color:#ffffff;">${title}</h1>
                </td>
                <td align="right" style="vertical-align:top;">
                  <span style="display:inline-block;background:${badgeColor};color:#ffffff;font-size:10px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;padding:8px 13px;border-radius:999px;">${badgeText}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 34px 30px;">
            <p style="margin:0 0 6px;color:#f58220;font-size:11px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase;">${eyebrow}</p>
            <p style="margin:0;color:#334155;font-size:17px;line-height:1.65;">${intro}</p>
            ${buildLeaveDetailsHtml(leaveRequest)}
            ${adminMessage ? `<div style="margin-top:18px;background:#fff7ed;border:1px solid #fed7aa;border-left:5px solid #f58220;border-radius:16px;padding:18px 20px;"><p style="margin:0 0 7px;color:#9a3412;font-size:11px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;">Admin Message</p><p style="margin:0;color:#334155;font-size:15px;line-height:1.7;font-weight:700;">${adminMessage}</p></div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 34px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#8a97aa;font-size:12px;text-align:center;line-height:1.6;">This is an automated email from <strong>Al-Alawi Dental Center System</strong>.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const sendLeaveRequestSubmittedEmail = async (to, leaveRequest) => {
  try {
    if (!to) return false;
    const transporter = createTransporter();
    const employeeName = getLeaveEmployeeName(leaveRequest);
    const html = buildLeaveEmailHtml({
      title: 'New Leave Request',
      eyebrow: 'Action Required',
      intro: `A new leave request has been submitted by <strong>${escapeHtml(employeeName)}</strong>.`,
      badgeText: 'Pending',
      badgeColor: '#f58220',
      leaveRequest,
    });

    await transporter.sendMail({
      from: `"Al-Alawi Dental Center" <${process.env.SMTP_FROM || 'info@alawidental.com'}>`,
      to,
      subject: `New leave request from ${employeeName}`,
      html,
    });

    console.log(`[Email] Sent leave request notification to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send leave request notification to ${to}:`, err.message);
    return false;
  }
};

const sendLeaveStatusEmail = async (to, leaveRequest, cc) => {
  try {
    if (!to) return false;
    const transporter = createTransporter();
    const status = leaveRequest.status || 'UPDATED';
    const statusText = status.toLowerCase();
    const isApproved = status === 'APPROVED';
    const isAnnualApproval = isApproved && leaveRequest.leaveType === 'ANNUAL';
    const html = buildLeaveEmailHtml({
      title: `Leave Request ${escapeHtml(status)}`,
      eyebrow: 'Request Update',
      intro: `Your leave request has been <strong>${escapeHtml(statusText)}</strong>.`,
      badgeText: status,
      badgeColor: isApproved ? '#2f5f9e' : '#f58220',
      leaveRequest,
      adminMessage: isAnnualApproval
        ? 'Make sure your duties are covered during your leave. Have a nice vacation.'
        : '',
    });

    await transporter.sendMail({
      from: `"Al-Alawi Dental Center" <${process.env.SMTP_FROM || 'info@alawidental.com'}>`,
      to,
      cc,
      subject: `Leave request ${statusText}`,
      html,
    });

    console.log(`[Email] Sent leave ${statusText} notification to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send leave status notification to ${to}:`, err.message);
    return false;
  }
};

const sendWorkScheduleEmail = async ({ to, employeeName, startDate, endDate, pdfBuffer }) => {
  try {
    if (!to || !pdfBuffer) return false;
    const transporter = createTransporter();
    const subjectRange = `${startDate} to ${endDate}`;
    const filenameSafeName = String(employeeName || 'Employee')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Employee';

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:32px 0;">
    <tr><td align="center" style="padding:0 14px;">
      <table width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 16px 42px rgba(28,55,86,0.14);">
        <tr><td style="height:7px;background:linear-gradient(90deg,#2f5f9e 0%,#2f5f9e 58%,#f58220 58%,#f58220 100%);"></td></tr>
        <tr>
          <td style="background:#1C3756;padding:30px 34px;color:#ffffff;">
            <p style="margin:0;color:rgba(255,255,255,0.78);font-size:12px;font-weight:900;letter-spacing:2.2px;text-transform:uppercase;">Al-Alawi Dental Center</p>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;">Work Schedule</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 34px;">
            <p style="margin:0 0 12px;color:#334155;font-size:16px;line-height:1.7;">Dear <strong>${escapeHtml(employeeName || 'Employee')}</strong>,</p>
            <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">Your work schedule for <strong>${escapeHtml(subjectRange)}</strong> is attached as a colored PDF file.</p>
            <div style="margin-top:20px;background:#fff7ed;border:1px solid #fed7aa;border-left:5px solid #f58220;border-radius:16px;padding:16px 18px;">
              <p style="margin:0;color:#9a3412;font-size:11px;font-weight:900;letter-spacing:1.3px;text-transform:uppercase;">Note</p>
              <p style="margin:6px 0 0;color:#334155;font-size:14px;line-height:1.6;">Please review your assigned shifts and contact administration if anything needs correction.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 34px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#8a97aa;font-size:12px;text-align:center;line-height:1.6;">This is an automated email from <strong>Al-Alawi Dental Center System</strong>.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Al-Alawi Dental Center" <${process.env.SMTP_FROM || 'info@alawidental.com'}>`,
      to,
      subject: `Work Schedule - ${subjectRange}`,
      html,
      attachments: [{
        filename: `Work Schedule - ${filenameSafeName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    console.log(`[Email] Sent work schedule to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send work schedule to ${to}:`, err.message);
    return false;
  }
};

module.exports = { sendReminderEmail, sendLeaveRequestSubmittedEmail, sendLeaveStatusEmail, sendWorkScheduleEmail };
