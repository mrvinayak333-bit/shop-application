const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Dynamically build nodemailer transporter from settings database table
async function getTransporter() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("smtp_host", "smtp_port", "smtp_user", "smtp_pass")');
  
  const config = {};
  rows.forEach(r => {
    config[r.setting_key] = r.setting_value;
  });

  const host = config.smtp_host || 'sandbox.smtp.mailtrap.io';
  const port = parseInt(config.smtp_port) || 2525;
  const user = config.smtp_user || '';
  const pass = config.smtp_pass || '';

  return nodemailer.createTransport({
    host,
    port,
    auth: {
      user,
      pass
    }
  });
}

// Send dynamic email using templates loaded from settings database table
async function sendMailFromTemplate(to, templateKey, replacements) {
  try {
    const [[templateRow]] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [templateKey]);
    const [[senderRow]] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = "smtp_sender"');
    
    let templateText = templateRow?.setting_value || '';
    const sender = senderRow?.setting_value || 'no-reply@repairsystem.com';

    // Replace all placeholders {placeholder_name} with actual values
    Object.entries(replacements).forEach(([key, val]) => {
      const placeholder = new RegExp(`{${key}}`, 'g');
      templateText = templateText.replace(placeholder, val);
    });

    const transporter = await getTransporter();
    
    let subject = 'SHREE RAAM MOBILE Update';
    if (templateKey.includes('welcome')) subject = 'Welcome to SHREE RAAM MOBILE! 🎉';
    else if (templateKey.includes('payment')) subject = 'Payment Receipt Acknowledged 💳';
    else if (templateKey.includes('course_approval')) subject = 'Course Enrollment Approved! 📚';
    else if (templateKey.includes('reset')) subject = 'Password Reset Assistance';

    const info = await transporter.sendMail({
      from: `"SHREE RAAM MOBILE" <${sender}>`,
      to,
      subject,
      text: templateText,
      html: templateText.replace(/\n/g, '<br>')
    });

    console.log(`Email sent successfully: ${info.messageId} to ${to}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email via template ${templateKey}:`, err.message);
    return false;
  }
}

module.exports = {
  sendMailFromTemplate
};
