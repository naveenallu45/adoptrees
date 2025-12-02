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
 * Get marketing email template by ID
 */
export function getMarketingEmailTemplate(templateId: string, displayName: string, userType: 'individual' | 'company', appUrl: string) {
  const templates: Record<string, { title: string; content: string; cta: string; ctaLink: string }> = {
    'adopt-trees': {
      title: '🌿 Plant More Trees, Create More Impact!',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Every tree you plant makes a difference. Join thousands of others who are contributing to a greener India!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Did you know that a single tree can absorb up to 22 kg of CO₂ per year? Imagine the impact when we plant together!</p>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #065f46; font-weight: 600;">🌱 Why Adopt Trees?</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #047857;">
            <li>Combat climate change by absorbing CO₂</li>
            <li>Produce clean oxygen for our planet</li>
            <li>Support local communities and farmers</li>
            <li>Create a lasting environmental legacy</li>
          </ul>
        </div>
      `,
      cta: 'Adopt Trees Now',
      ctaLink: `${appUrl}/individuals`
    },
    'create-forest': {
      title: '🌳 Create a Forest for Your Special Moments',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Celebrate birthdays, weddings, anniversaries, and more by creating a forest that grows with your memories!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Share your forest with friends and family, and let them contribute to your green legacy.</p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">✨ Perfect For:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #78350f;">
            <li>Birthday celebrations</li>
            <li>Wedding anniversaries</li>
            <li>Corporate milestones</li>
            <li>Memorial tributes</li>
            <li>Any special occasion</li>
          </ul>
        </div>
      `,
      cta: 'Create Your Forest',
      ctaLink: `${appUrl}/create-forest`
    },
    'tree-growth': {
      title: '💚 Your Trees Are Growing Strong!',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Your adopted trees are being cared for by our dedicated well-wishers and are growing beautifully!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Check your dashboard to see the latest growth updates, planting photos, and location details.</p>
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-weight: 600;">📊 Track Your Impact:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #1e3a8a;">
            <li>View real-time growth photos</li>
            <li>See planting locations on map</li>
            <li>Track CO₂ absorption progress</li>
            <li>Download your certificate</li>
          </ul>
        </div>
      `,
      cta: 'View Your Trees',
      ctaLink: `${appUrl}/dashboard/${userType}/trees`
    },
    'green-revolution': {
      title: '🌱 Join the Green Revolution',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Be part of India's green transformation! Every tree you adopt helps restore our environment and supports local communities.</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Together, we're building a sustainable future, one tree at a time.</p>
        <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 700;">🌍 Make a Difference Today</p>
          <p style="margin: 10px 0 0 0; color: #047857; font-size: 14px;">Your contribution matters. Every tree counts!</p>
        </div>
      `,
      cta: 'Start Planting',
      ctaLink: `${appUrl}/individuals`
    },
    'gift-tree': {
      title: '🎁 Gift a Tree, Gift a Future',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Looking for a meaningful gift? Give the gift of a greener future!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Plant trees in someone's name for birthdays, anniversaries, or any special occasion. It's a gift that keeps growing!</p>
        <div style="background: #fce7f3; border-left: 4px solid #ec4899; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #9f1239; font-weight: 600;">💝 Why Gift Trees?</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #831843;">
            <li>Meaningful and sustainable</li>
            <li>Creates lasting memories</li>
            <li>Supports environmental causes</li>
            <li>Perfect for any occasion</li>
          </ul>
        </div>
      `,
      cta: 'Send a Gift Tree',
      ctaLink: `${appUrl}/individuals`
    },
    'environmental-impact': {
      title: '🌿 Your Impact on the Environment',
      content: `
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hello ${displayName}!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Thank you for being part of our mission to create a greener India!</p>
        <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Your tree adoptions are making a real difference. Here's how:</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 700; text-align: center;">📈 Environmental Impact</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">🌳</p>
              <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">Trees Planted</p>
            </div>
            <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">💨</p>
              <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">Oxygen Produced</p>
            </div>
            <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">🌍</p>
              <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">CO₂ Absorbed</p>
            </div>
            <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">🤝</p>
              <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px; font-weight: 600;">Communities Supported</p>
            </div>
          </div>
        </div>
      `,
      cta: 'Adopt More Trees',
      ctaLink: `${appUrl}/individuals`
    }
  };

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
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${message.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${message.title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          ${message.content}
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">💡 Fun Fact:</p>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Trees can live for hundreds, even thousands of years. Your contribution today will benefit generations to come!</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${message.ctaLink}" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              ${message.cta}
            </a>
          </div>
          <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
              <strong>📊 Your Impact:</strong> Every tree you adopt contributes to cleaner air, restored ecosystems, and a healthier planet. Thank you for being part of this green movement!
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions or need assistance, feel free to reach out to us. We're here to help!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            You're receiving this email because you're a registered member of Adoptrees.<br>
            <a href="${appUrl}/dashboard/${userType}/settings" style="color: #6b7280; text-decoration: underline;">Manage your email preferences</a>
          </p>
        </div>
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

