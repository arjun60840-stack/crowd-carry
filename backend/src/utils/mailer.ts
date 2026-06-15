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
