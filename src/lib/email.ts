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
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
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
      attachments: options.attachments || [],
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

export async function sendWelcomeEmail(email: string, name: string, userType: 'individual' | 'company'): Promise<boolean> {
  const displayName = name || (userType === 'company' ? 'Valued Customer' : 'Friend');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Adoptrees</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Adoptrees!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
          <p>We're thrilled to have you join the Adoptrees community! 🌳</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Browse and adopt trees to make a positive impact on the environment</li>
            <li>Create your own forest for special occasions</li>
            <li>Track your tree adoptions and watch them grow</li>
            <li>Share your forest with friends and family</li>
          </ul>
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">Ready to start planting? Visit your dashboard to begin your journey!</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com'}/dashboard/${userType}/trees" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              Go to Dashboard
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions, feel free to reach out to us. We're here to help!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Adoptrees - Start Your Green Journey! 🌳',
    html,
  });
}

/**
 * Send thank you email with certificate PDF after successful tree adoption
 */
export async function sendThankYouEmailWithCertificate(
  email: string,
  name: string,
  orderId: string,
  treesCount: number,
  certificateBuffer: Buffer
): Promise<boolean> {
  const displayName = name || 'Friend';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contributing to a Greener India</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌳 Thank You! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 16px; color: #374151;">Thank you for contributing to a <strong>Greener India</strong>! 🌿</p>
          <p style="color: #374151;">Your commitment to planting <strong>${treesCount} tree${treesCount > 1 ? 's' : ''}</strong> is making a real difference in our environment. Every tree you adopt helps:</p>
          <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
            <li>🌱 Combat climate change by absorbing CO₂</li>
            <li>💨 Produce clean oxygen for our planet</li>
            <li>🌍 Restore biodiversity and ecosystems</li>
            <li>🤝 Support local communities and farmers</li>
          </ul>
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">📄 Your certificate is attached to this email!</p>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Download and share your contribution certificate with pride.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View Your Trees
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">We'll keep you updated as your trees are planted and grow. Stay tuned for planting photos and location details!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Order ID: ${orderId}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Thank You for Contributing to a Greener India 🌳 - Your Certificate',
    html,
    attachments: [
      {
        filename: `Adoptrees_Certificate_${orderId}.pdf`,
        content: certificateBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

/**
 * Send planting confirmation email with images and map location
 */
export async function sendPlantingConfirmationEmail(
  email: string,
  name: string,
  treeName: string,
  quantity: number,
  plantingImages: Array<{ url: string; caption?: string }>,
  plantingLocation?: { latitude: number; longitude: number },
  plantingNotes?: string
): Promise<boolean> {
  const displayName = name || 'Friend';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  // Generate Google Maps URL if location is available
  let mapUrl = '';
  let mapEmbed = '';
  const hasGoogleMapsKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (plantingLocation) {
    mapUrl = `https://www.google.com/maps?q=${plantingLocation.latitude},${plantingLocation.longitude}`;
    if (hasGoogleMapsKey) {
      mapEmbed = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${plantingLocation.latitude},${plantingLocation.longitude}`;
    }
  }
  
  const imagesHtml = plantingImages.map((img, index) => `
    <div style="margin: 15px 0;">
      <img src="${img.url}" alt="Planting image ${index + 1}" style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; border: 2px solid #e5e7eb;" />
      ${img.caption ? `<p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-align: center;">${img.caption}</p>` : ''}
    </div>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Tree Has Been Planted! 🌱</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Your Tree Has Been Planted! 🌱</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 16px; color: #374151;">Great news! Your <strong>${quantity} ${treeName} tree${quantity > 1 ? 's have' : ' has'} been successfully planted</strong>! 🎉</p>
          <p style="color: #374151;">Our well-wisher has carefully planted your tree${quantity > 1 ? 's' : ''} and captured the moment for you. Here are the planting photos:</p>
          
          ${imagesHtml}
          
          ${plantingNotes ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 500;">📝 Planting Notes:</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${plantingNotes}</p>
            </div>
          ` : ''}
          
          ${plantingLocation ? `
            <div style="background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">📍 Planting Location</h3>
              <p style="color: #374151; margin-bottom: 15px;">Your tree${quantity > 1 ? 's have' : ' has'} been planted at:</p>
              ${mapEmbed ? `
                <div style="margin: 15px 0;">
                  <iframe
                    width="100%"
                    height="300"
                    style="border: 0; border-radius: 8px;"
                    src="${mapEmbed}"
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade">
                  </iframe>
                </div>
              ` : ''}
              <div style="text-align: center; margin-top: ${mapEmbed ? '15px' : '0'};">
                <a href="${mapUrl}" 
                   target="_blank"
                   style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  ${mapEmbed ? 'Open in Google Maps' : 'View Location on Google Maps'}
                </a>
              </div>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View Your Trees
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">We'll send you regular growth updates as your tree${quantity > 1 ? 's' : ''} continue${quantity > 1 ? '' : 's'} to grow and thrive!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🌱 Your ${treeName} Tree${quantity > 1 ? 's Have' : ' Has'} Been Planted!`,
    html,
  });
}

/**
 * Send growth update email with images
 */
export async function sendGrowthUpdateEmail(
  email: string,
  name: string,
  treeName: string,
  quantity: number,
  growthImages: Array<{ url: string; caption?: string }>,
  notes?: string,
  daysSincePlanting?: number
): Promise<boolean> {
  const displayName = name || 'Friend';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  const imagesHtml = growthImages.map((img, index) => `
    <div style="margin: 15px 0;">
      <img src="${img.url}" alt="Growth update image ${index + 1}" style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; border: 2px solid #e5e7eb;" />
      ${img.caption ? `<p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-align: center;">${img.caption}</p>` : ''}
    </div>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Growth Update: Your Tree is Growing! 🌳</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌳 Growth Update! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 16px; color: #374151;">Your <strong>${treeName} tree${quantity > 1 ? 's are' : ' is'} growing beautifully</strong>! 🌿</p>
          ${daysSincePlanting ? `<p style="color: #6b7280; font-size: 14px;">It's been <strong>${daysSincePlanting} day${daysSincePlanting > 1 ? 's' : ''}</strong> since planting.</p>` : ''}
          <p style="color: #374151;">Here's the latest update on your tree${quantity > 1 ? 's' : ''} with fresh photos:</p>
          
          ${imagesHtml}
          
          ${notes ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 500;">📝 Update Notes:</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${notes}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View All Updates
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">We'll continue to send you regular updates as your tree${quantity > 1 ? 's' : ''} grow${quantity > 1 ? '' : 's'} and thrive!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🌳 Growth Update: Your ${treeName} Tree${quantity > 1 ? 's Are' : ' Is'} Growing!`,
    html,
  });
}

/**
 * Get marketing email template by ID with separate templates for individual and company users
 * Production-level templates with professional design and user-specific messaging
 */
export function getMarketingEmailTemplate(templateId: string, displayName: string, userType: 'individual' | 'company', appUrl: string) {
  // Individual user templates
  const individualTemplates: Record<string, { title: string; content: string; cta: string; ctaLink: string }> = {
    'adopt-trees': {
      title: '🌿 Plant More Trees, Create More Impact!',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Every tree you plant makes a difference. Join thousands contributing to a greener India!</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The best time to plant a tree was 20 years ago. The second best time is now."</p>
          <p style="margin: 0; color: #047857; font-size: 14px; text-align: center;">— Chinese Proverb</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>💡 Start Today:</strong> Receive a personalized certificate for every tree you adopt!
          </p>
        </div>
      `,
      cta: 'Adopt Trees Now',
      ctaLink: `${appUrl}/individuals`
    },
    'create-forest': {
      title: '🌳 Create a Forest for Your Special Moments',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Celebrate life's precious moments with a forest that grows with your memories. Perfect for birthdays, weddings, anniversaries, or any milestone.</p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
          <p style="margin: 0 0 15px 0; color: #92400e; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"A society grows great when old men plant trees whose shade they know they shall never sit in."</p>
          <p style="margin: 0; color: #78350f; font-size: 14px; text-align: center;">— Greek Proverb</p>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde047; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #854d0e; font-size: 14px; line-height: 1.6;">
            <strong>🎁 Invite Friends:</strong> Let loved ones contribute to your green legacy!
          </p>
        </div>
      `,
      cta: 'Create Your Forest',
      ctaLink: `${appUrl}/create-forest`
    },
    'tree-growth': {
      title: '💚 Your Trees Are Growing Strong!',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Great news! Your trees are thriving and making a real impact. Check your dashboard for latest growth updates, photos, and location details.</p>
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">
          <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves and to one another."</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; text-align: center;">— Mahatma Gandhi</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
            <strong>📸 New Updates:</strong> Fresh photos and growth metrics available in your dashboard!
          </p>
        </div>
      `,
      cta: 'View Your Trees',
      ctaLink: `${appUrl}/dashboard/individual/trees`
    },
    'green-revolution': {
      title: '🌱 Join the Green Revolution',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Be part of India's green transformation! Every tree helps restore our environment and supports local communities.</p>
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic;">"He who plants a tree plants a hope."</p>
          <p style="margin: 0; color: #047857; font-size: 14px;">— Lucy Larcom</p>
        </div>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
            <strong>🌟 Join 10,000+</strong> individuals already making a difference!
          </p>
        </div>
      `,
      cta: 'Start Planting',
      ctaLink: `${appUrl}/individuals`
    },
    'gift-tree': {
      title: '🎁 Gift a Tree, Gift a Future',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Give the gift of a greener future! Plant trees in someone's name for birthdays, anniversaries, or any special occasion. A gift that keeps growing!</p>
        <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(236, 72, 153, 0.1);">
          <p style="margin: 0 0 15px 0; color: #9f1239; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The gift of a tree is the gift of life itself."</p>
          <p style="margin: 0; color: #831843; font-size: 14px; text-align: center;">— Unknown</p>
        </div>
        <div style="background: #fdf2f8; border: 1px solid #f9a8d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #831843; font-size: 14px; line-height: 1.6;">
            <strong>🎀 Include:</strong> Personalized message and beautiful certificate for your recipient!
          </p>
        </div>
      `,
      cta: 'Send a Gift Tree',
      ctaLink: `${appUrl}/individuals`
    },
    'environmental-impact': {
      title: '🌿 Your Impact on the Environment',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for creating a greener India! Your tree adoptions are making a measurable difference.</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"In every walk with nature, one receives far more than he seeks."</p>
          <p style="margin: 0 0 20px 0; color: #047857; font-size: 14px; text-align: center;">— John Muir</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🌳</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Trees Planted</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">💨</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Oxygen Produced</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🌍</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">CO₂ Absorbed</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🤝</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Communities</p>
            </div>
          </div>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>🎯 Keep Growing:</strong> Expand your impact and invite friends to join!
          </p>
        </div>
      `,
      cta: 'Adopt More Trees',
      ctaLink: `${appUrl}/individuals`
    },
    'forest': {
      title: '🌲 Grow Your Forest: Watch Your Legacy Flourish',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your forest is growing beautifully! Every tree is part of a living ecosystem making a real difference.</p>
        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The creation of a thousand forests is in one acorn."</p>
          <p style="margin: 0; color: #047857; font-size: 14px; text-align: center;">— Ralph Waldo Emerson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>🌿 View Your Forest:</strong> Check your dashboard to see your thriving trees and their impact!
          </p>
        </div>
      `,
      cta: 'View Your Forest',
      ctaLink: `${appUrl}/dashboard/individual/forest`
    },
    'christmas': {
      title: '🎄 This Christmas, Plant Hope with Every Tree',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hi ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">This Christmas, let your gifts grow roots. Plant trees for your loved ones and turn festive joy into a greener future.</p>
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(148, 163, 184, 0.25);">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"Christmas is the spirit of giving without a thought of getting."</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px; text-align: center;">— Thomas S. Monson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            🎁 <strong>Idea:</strong> Dedicate a tree for each friend or family member and share their digital certificate.
          </p>
        </div>
      `,
      cta: 'Plant a Christmas Tree Gift',
      ctaLink: `${appUrl}/individuals?campaign=christmas`
    },
    'new-year': {
      title: '✨ New Year, Greener You: Start 2025 with a Tree',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hi ${displayName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Begin the New Year with a resolution that truly matters—plant trees that will keep giving back for years.</p>
        <div style="background: linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.18);">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The New Year stands before us, like a chapter in a book, waiting to be written."</p>
          <p style="margin: 0; color: #334155; font-size: 14px; text-align: center;">— Melody Beattie</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            🌱 <strong>Resolution:</strong> Adopt at least one tree this year and track its impact in your dashboard.
          </p>
        </div>
      `,
      cta: 'Start the Year by Planting',
      ctaLink: `${appUrl}/individuals?campaign=new-year`
    }
  };

  // Company user templates
  const companyTemplates: Record<string, { title: string; content: string; cta: string; ctaLink: string }> = {
    'adopt-trees': {
      title: '🌿 Corporate Tree Adoption: Build Your Green Legacy',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Elevate your CSR with our Corporate Tree Adoption Program. Join leading companies making measurable environmental impact while strengthening brand values.</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"Businesses that are good stewards of the environment are also good stewards of their bottom line."</p>
          <p style="margin: 0; color: #047857; font-size: 14px; text-align: center;">— Unknown</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>💼 Benefits:</strong> ESG compliance, carbon offset, brand enhancement, and detailed impact reports!
          </p>
        </div>
      `,
      cta: 'Explore Corporate Programs',
      ctaLink: `${appUrl}/companies`
    },
    'create-forest': {
      title: '🌳 Corporate Forest Programs: Celebrate Milestones Sustainably',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Create a corporate forest to commemorate milestones, anniversaries, or achievements. A living testament to your sustainability commitment.</p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
          <p style="margin: 0 0 15px 0; color: #92400e; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The greatest threat to our planet is the belief that someone else will save it."</p>
          <p style="margin: 0; color: #78350f; font-size: 14px; text-align: center;">— Robert Swan</p>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde047; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #854d0e; font-size: 14px; line-height: 1.6;">
            <strong>🎁 Features:</strong> Branded certificates, custom messaging, and comprehensive impact analytics!
          </p>
        </div>
      `,
      cta: 'Create Corporate Forest',
      ctaLink: `${appUrl}/create-forest`
    },
    'tree-growth': {
      title: '💚 Your Corporate Trees: Growing Impact, Measurable Results',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your corporate trees are thriving! Access your dashboard for growth reports, impact metrics, and certificates—perfect for ESG reporting.</p>
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">
          <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"Sustainability is no longer about doing less harm. It's about doing more good."</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; text-align: center;">— Jochen Zeitz</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
            <strong>📈 New Updates:</strong> Latest metrics and growth photos available in your dashboard!
          </p>
        </div>
      `,
      cta: 'View Corporate Dashboard',
      ctaLink: `${appUrl}/dashboard/company/trees`
    },
    'green-revolution': {
      title: '🌱 Corporate Green Revolution: Lead the Change',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Position your company as a sustainability leader. Join India's corporate green revolution and demonstrate your commitment to environmental stewardship.</p>
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic;">"The business of business should not be about money. It should be about responsibility."</p>
          <p style="margin: 0; color: #047857; font-size: 14px;">— Anita Roddick</p>
        </div>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
            <strong>🏆 Join 500+</strong> companies already making a difference!
          </p>
        </div>
      `,
      cta: 'Start Corporate Program',
      ctaLink: `${appUrl}/companies`
    },
    'gift-tree': {
      title: '🎁 Corporate Gift Trees: Meaningful Business Relationships',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Strengthen relationships with sustainable gifts. Perfect for client appreciation, employee recognition, and corporate events. Each gift includes a personalized certificate.</p>
        <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(236, 72, 153, 0.1);">
          <p style="margin: 0 0 15px 0; color: #9f1239; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The way to get started is to quit talking and begin doing."</p>
          <p style="margin: 0; color: #831843; font-size: 14px; text-align: center;">— Walt Disney</p>
        </div>
        <div style="background: #fdf2f8; border: 1px solid #f9a8d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #831843; font-size: 14px; line-height: 1.6;">
            <strong>🎀 Corporate Program:</strong> Bulk pricing, custom branding, and dedicated account management!
          </p>
        </div>
      `,
      cta: 'Explore Corporate Gifting',
      ctaLink: `${appUrl}/companies`
    },
    'environmental-impact': {
      title: '🌿 Your Corporate Environmental Impact: Measurable Results',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for your commitment to sustainability! Your tree adoptions strengthen your ESG profile and demonstrate environmental leadership.</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"We do not inherit the earth from our ancestors; we borrow it from our children."</p>
          <p style="margin: 0 0 20px 0; color: #047857; font-size: 14px; text-align: center;">— Native American Proverb</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🌳</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Trees Planted</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">💨</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Oxygen Produced</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🌍</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">CO₂ Offset</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 32px; font-weight: 700; line-height: 1;">🤝</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px; font-weight: 600;">Communities</p>
            </div>
          </div>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>📊 Scale Up:</strong> Expand your program and receive comprehensive ESG reports!
          </p>
        </div>
      `,
      cta: 'Scale Corporate Program',
      ctaLink: `${appUrl}/companies`
    },
    'forest': {
      title: '🌲 Corporate Forest Growth: Building Sustainable Legacy',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your corporate forest is thriving! Every tree represents your commitment to sustainability and demonstrates measurable ESG achievements.</p>
        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The environment is where we all meet; where we all have a mutual interest; it is the one thing all of us share."</p>
          <p style="margin: 0; color: #047857; font-size: 14px; text-align: center;">— Lady Bird Johnson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            <strong>🌿 View Dashboard:</strong> Track growth, impact metrics, and download reports for stakeholders!
          </p>
        </div>
      `,
      cta: 'View Corporate Forest',
      ctaLink: `${appUrl}/dashboard/company/forest`
    },
    'christmas': {
      title: '🎄 Corporate Christmas: Celebrate with a Greener Future',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">This Christmas, turn corporate gifting into real impact. Plant trees for clients, partners, and employees as a meaningful, sustainable gesture.</p>
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(148, 163, 184, 0.25);">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"At Christmas, all roads lead home."</p>
          <p style="margin: 0; color: #4b5563; font-size: 14px; text-align: center;">— Marjorie Holmes</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            🎁 <strong>Corporate Idea:</strong> Replace traditional hampers with tree gifts and share impact reports with stakeholders.
          </p>
        </div>
      `,
      cta: 'Launch Christmas Tree Campaign',
      ctaLink: `${appUrl}/companies?campaign=christmas`
    },
    'new-year': {
      title: '✨ New Year ESG Kickoff: Plant Trees with Your Team',
      content: `
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName} Team,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Start the New Year by strengthening your ESG commitments. Plant trees for your company, your people, and the planet.</p>
        <div style="background: linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.18);">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 16px; font-style: italic; text-align: center;">"The future depends on what you do today."</p>
          <p style="margin: 0; color: #334155; font-size: 14px; text-align: center;">— Mahatma Gandhi</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            🌱 <strong>New Year Action:</strong> Launch a company-wide tree adoption drive and share impact in your annual ESG report.
          </p>
        </div>
      `,
      cta: 'Start New Year Tree Program',
      ctaLink: `${appUrl}/companies?campaign=new-year`
    }
  };

  // Return template based on user type
  const templates = userType === 'company' ? companyTemplates : individualTemplates;
  return templates[templateId] || templates['adopt-trees'];
}

/**
 * Send marketing email to registered users
 * This email is sent every 10 days to keep users engaged
 */
export async function sendMarketingEmail(
  email: string,
  name: string,
  userType: 'individual' | 'company',
  templateId?: string
): Promise<boolean> {
  const displayName = name || (userType === 'company' ? 'Valued Customer' : 'Friend');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  // Use provided template or rotate between different marketing messages
  let message;
  if (templateId) {
    message = getMarketingEmailTemplate(templateId, displayName, userType, appUrl);
  } else {
    // Rotate between different marketing messages for automated emails
    const marketingMessages = [
      getMarketingEmailTemplate('adopt-trees', displayName, userType, appUrl),
      getMarketingEmailTemplate('create-forest', displayName, userType, appUrl),
      getMarketingEmailTemplate('tree-growth', displayName, userType, appUrl),
      getMarketingEmailTemplate('green-revolution', displayName, userType, appUrl),
      getMarketingEmailTemplate('gift-tree', displayName, userType, appUrl)
    ];
    const messageIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 10)) % marketingMessages.length;
    message = marketingMessages[messageIndex];
  }
  
  // Production-level email HTML with responsive design and better structure
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${message.title}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <!-- Wrapper Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <!-- Main Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">${message.title}</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
          ${message.content}
                    
                    <!-- Inspirational Quote Section -->
                    <div style="background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 30px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                      <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600; font-size: 16px;">💡 Inspiration</p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; font-style: italic;">
                        ${userType === 'company' 
                          ? '"The future belongs to those who understand that doing more with less is compassionate, prosperous, and enduring." — Paul Hawken'
                          : '"The Earth does not belong to us; we belong to the Earth. All things are connected." — Chief Seattle'
                        }
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
            <a href="${message.ctaLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
              ${message.cta}
            </a>
          </div>
                    
                    <!-- Impact Section -->
                    <div style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border: 1px solid #7dd3fc; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #0c4a6e; font-size: 15px; line-height: 1.6;">
                        <strong>📊 ${userType === 'company' ? 'Corporate Impact:' : 'Your Impact:'}</strong> 
                        ${userType === 'company' 
                          ? 'Every tree your company adopts contributes to ESG compliance, carbon offset goals, and demonstrates environmental leadership. Thank you for being part of India\'s corporate green movement!'
                          : 'Every tree you adopt contributes to cleaner air, restored ecosystems, and a healthier planet. Thank you for being part of this green movement!'
                        }
            </p>
          </div>
                    
                    <!-- Closing -->
                    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 30px;">
                      If you have any questions or need assistance, feel free to reach out to us. We're here to help!
                    </p>
                    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-top: 20px;">
                      Best regards,<br>
                      <strong style="color: #10b981;">The Adoptrees Team</strong> 🌿
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
            You're receiving this email because you're a registered member of Adoptrees.<br>
                      <a href="${appUrl}/dashboard/${userType}/settings" style="color: #6b7280; text-decoration: underline;">Manage your email preferences</a> | 
                      <a href="${appUrl}" style="color: #6b7280; text-decoration: underline;">Visit Adoptrees</a>
                    </p>
                    <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.6; text-align: center;">
                      © ${new Date().getFullYear()} Adoptrees. All rights reserved.<br>
                      Building a Greener India, One Tree at a Time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: message.title,
    html,
  });
}

/**
 * Send onboarding email to well-wisher with login details
 */
export async function sendWellWisherOnboardingEmail(
  email: string,
  name: string,
  password: string
): Promise<boolean> {
  const displayName = name || 'Well-Wisher';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  const loginUrl = `${appUrl}/wellwisher/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Adoptrees - Well-Wisher Onboarding</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌿 Welcome to Adoptrees! 🌿</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
          <p style="font-size: 16px; color: #374151;">We're thrilled to have you join our team as a Well-Wisher! Your role is crucial in helping us plant and care for trees across India. 🌳</p>
          
          <div style="background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">🔐 Your Login Credentials</h3>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0; color: #065f46; font-weight: 600; margin-bottom: 8px;">Email:</p>
              <p style="margin: 0; color: #1f2937; font-size: 16px; font-family: monospace; word-break: break-all;">${email}</p>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0; color: #065f46; font-weight: 600; margin-bottom: 8px;">Password:</p>
              <p style="margin: 0; color: #1f2937; font-size: 16px; font-family: monospace; letter-spacing: 2px;">${password}</p>
            </div>
            <p style="color: #dc2626; font-size: 14px; margin-top: 15px; padding: 10px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
              <strong>⚠️ Important:</strong> Please save these credentials securely. For security reasons, we recommend changing your password after your first login.
            </p>
          </div>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">📋 What You'll Be Doing:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Plant trees assigned to you</li>
              <li>Upload planting photos and location details</li>
              <li>Provide regular growth updates with photos</li>
              <li>Help create a greener India, one tree at a time!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              Login to Your Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions or need assistance, feel free to reach out to us. We're here to support you!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🌿 Welcome to Adoptrees - Well-Wisher Onboarding',
    html,
  });
}

/**
 * Send greeting email to well-wisher on onboarding
 */
export async function sendWellWisherGreetingEmail(
  email: string,
  name: string
): Promise<boolean> {
  const displayName = name || 'Well-Wisher';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Greetings from Adoptrees</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌳 Greetings from Adoptrees! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
          <p style="font-size: 16px; color: #374151;">Welcome to the Adoptrees family! We're so excited to have you on board as a Well-Wisher. 🌿</p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 700;">Thank you for joining our mission to create a Greener India!</p>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 14px;">Your dedication to planting and caring for trees makes a real difference in our environment.</p>
          </div>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">💚 Together, we're:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Planting trees that will grow for generations</li>
              <li>Creating cleaner air and healthier ecosystems</li>
              <li>Supporting local communities and farmers</li>
              <li>Building a sustainable future for India</li>
            </ul>
          </div>
          
          <p style="color: #374151; font-size: 16px; margin-top: 25px;">We're here to support you every step of the way. If you ever need help or have questions, don't hesitate to reach out!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Once again, welcome to the team! We're grateful to have you with us. 🌱</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🌳 Greetings from Adoptrees - Welcome to Our Team!',
    html,
  });
}

/**
 * Send update email to well-wisher with updated login details
 */
export async function sendWellWisherUpdateEmail(
  email: string,
  name: string,
  password?: string,
  emailChanged?: boolean
): Promise<boolean> {
  const displayName = name || 'Well-Wisher';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  const loginUrl = `${appUrl}/wellwisher/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Well-Wisher Account Has Been Updated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📝 Account Updated</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
          <p style="font-size: 16px; color: #374151;">Your Well-Wisher account has been updated by the administrator.</p>
          
          ${emailChanged ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">📧 Email Address Changed</p>
              <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">Your login email has been updated to: <strong>${email}</strong></p>
            </div>
          ` : ''}
          
          ${password ? `
            <div style="background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">🔐 Updated Password</h3>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0; color: #065f46; font-weight: 600; margin-bottom: 8px;">New Password:</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px; font-family: monospace; letter-spacing: 2px;">${password}</p>
              </div>
              <p style="color: #dc2626; font-size: 14px; margin-top: 15px; padding: 10px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
                <strong>⚠️ Important:</strong> Please use this new password to login. For security reasons, we recommend changing it after your next login.
              </p>
            </div>
          ` : ''}
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">📋 Updated Login Information:</p>
            <div style="margin-top: 10px;">
              <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
              ${password ? `<p style="margin: 5px 0; color: #374151;"><strong>Password:</strong> Updated (see above)</p>` : '<p style="margin: 5px 0; color: #374151;"><strong>Password:</strong> Unchanged</p>'}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              Login to Your Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this update or have any concerns, please contact us immediately.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '📝 Your Well-Wisher Account Has Been Updated',
    html,
  });
}

/**
 * Send task assignment email to well-wisher when tasks are assigned
 */
export async function sendWellWisherTaskAssignmentEmail(
  email: string,
  name: string,
  orderId: string,
  tasks: Array<{
    taskId: string;
    task: string;
    description: string;
    scheduledDate: Date;
    priority: 'low' | 'medium' | 'high';
  }>,
  orderDetails?: {
    totalTrees?: number;
    customerName?: string;
    isGift?: boolean;
  }
): Promise<boolean> {
  const displayName = name || 'Well-Wisher';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  const dashboardUrl = `${appUrl}/wellwisher`;
  
  const totalTasks = tasks.length;
  const totalTrees = orderDetails?.totalTrees || tasks.length;
  const customerName = orderDetails?.customerName || 'Customer';
  
  // Format scheduled dates
  const tasksListHtml = tasks.map((task, index) => {
    const scheduledDate = new Date(task.scheduledDate);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const priorityColors = {
      low: '#6b7280',
      medium: '#f59e0b',
      high: '#dc2626'
    };
    
    const priorityLabels = {
      low: 'Low',
      medium: 'Medium',
      high: 'High'
    };
    
    return `
      <div style="background: white; border-left: 4px solid ${priorityColors[task.priority]}; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">Task ${index + 1}: ${task.task}</p>
          <span style="background: ${priorityColors[task.priority]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${priorityLabels[task.priority]} Priority
          </span>
        </div>
        <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${task.description}</p>
        <p style="margin: 5px 0 0 0; color: #374151; font-size: 13px;">
          <strong>📅 Scheduled:</strong> ${formattedDate}
        </p>
      </div>
    `;
  }).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Tasks Assigned - Adoptrees</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌳 New Tasks Assigned! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
          <p style="font-size: 16px; color: #374151;">You have been assigned <strong>${totalTasks} new task${totalTasks > 1 ? 's' : ''}</strong> for order <strong>${orderId}</strong>.</p>
          
          ${orderDetails?.isGift ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">🎁 Gift Order</p>
              <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">This is a gift order for ${customerName}</p>
            </div>
          ` : `
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 500;">👤 Customer:</p>
              <p style="margin: 5px 0 0 0; color: #374151; font-size: 14px;">${customerName}</p>
            </div>
          `}
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 700;">📊 Task Summary</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">${totalTasks}</p>
                <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">Task${totalTasks > 1 ? 's' : ''}</p>
              </div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">${totalTrees}</p>
                <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">Tree${totalTrees > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          
          <div style="margin: 25px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">📋 Task Details:</h3>
            ${tasksListHtml}
          </div>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">📝 Next Steps:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Review the task details and schedule</li>
              <li>Prepare for planting at the scheduled dates</li>
              <li>Upload planting photos and location details when completed</li>
              <li>Provide regular growth updates as the trees grow</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View Tasks in Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Thank you for your dedication to planting and caring for trees. Your work is making a real difference! 🌿</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Order ID: ${orderId}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🌳 New Tasks Assigned - Order ${orderId}`,
    html,
  });
}

