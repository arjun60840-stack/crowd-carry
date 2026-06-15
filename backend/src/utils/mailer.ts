import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Run SMTP credentials checks on startup
if (process.env.NODE_ENV === 'production') {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || smtpUser === 'your-email@gmail.com' || smtpUser === '') {
    logger.error('CRITICAL: SMTP_USER is not configured in production.');
    process.exit(1);
  }
  if (!smtpPass || smtpPass === 'your-app-password' || smtpPass === '') {
    logger.error('CRITICAL: SMTP_PASS is not configured in production.');
    process.exit(1);
  }
}

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error('❌ SMTP connection check failed on startup:', error.message);
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: Failing startup due to broken SMTP connection in production.');
      process.exit(1);
    }
  } else {
    logger.info('✅ SMTP connection verified successfully and ready to send emails');
  }
});

/**
 * Send a transaction email using SMTP transporter.
 * Falls back gracefully with a log if credentials are not configured in environment.
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const smtpUser = process.env.SMTP_USER;
  
  if (!smtpUser || smtpUser === 'your-email@gmail.com' || smtpUser === '') {
    logger.warn(`[SMTP Mailer Simulator] To: ${to} | Subject: ${subject}`);
    logger.info(`To make this email deliver to the inbox, configure SMTP_USER & SMTP_PASS in backend/.env`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Crowd Carry" <noreply@crowdcarry.com>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    return false;
  }
};

/**
 * Simple HTML escape function to prevent XSS injections in email templates
 */
export const escapeHtml = (unsafe: string): string => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Send an email with retry logic and exponential backoff.
 */
export const sendEmailWithRetry = async (
  to: string,
  subject: string,
  html: string,
  maxRetries = 3
): Promise<boolean> => {
  let delay = 3000; // start with 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const success = await sendEmail(to, subject, html);
    if (success) return true;

    if (attempt < maxRetries) {
      logger.warn(`SMTP Send attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // double the delay for exponential backoff (e.g. 3s, 6s, 12s)
    }
  }

  logger.error(`SMTP Send failed completely after ${maxRetries} attempts for recipient: ${to}`);
  return false;
};
