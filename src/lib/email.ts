import nodemailer from 'nodemailer';
import { env } from './env';

// Create reusable transporter
const createTransporter = () => {
  // If SMTP is not configured, return null (for development)
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('SMTP not configured. Email sending will be disabled.');
    }
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || '587'),
    secure: parseInt(env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      return true; // Return true in dev to allow testing
    }
    return false;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM_EMAIL 
        ? `"${env.SMTP_FROM_NAME || 'Adoptrees'}" <${env.SMTP_FROM_EMAIL}>`
        : env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
        console.error('\n⚠️  Gmail Authentication Error:');
        console.error('Please ensure you are using an App Password, not your regular Gmail password.');
        console.error('Steps to fix:');
        console.error('1. Enable 2-Step Verification: https://myaccount.google.com/security');
        console.error('2. Generate App Password: https://myaccount.google.com/apppasswords');
        console.error('3. Use the 16-character App Password in SMTP_PASSWORD\n');
      } else if (error.message.includes('EAUTH')) {
        console.error('\n⚠️  SMTP Authentication Failed');
        console.error('Please check your SMTP credentials in .env.local\n');
      }
    }
    
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Adoptrees</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
          <p>You have requested to reset your password. Use the following OTP to verify your identity:</p>
          <div style="background: white; border: 2px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 6px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset OTP - Adoptrees',
    html,
  });
}

