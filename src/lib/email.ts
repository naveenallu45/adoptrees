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
 * Send marketing email to registered users
 * This email is sent every 10 days to keep users engaged
 */
export async function sendMarketingEmail(
  email: string,
  name: string,
  userType: 'individual' | 'company'
): Promise<boolean> {
  const displayName = name || (userType === 'company' ? 'Valued Customer' : 'Friend');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  // Rotate between different marketing messages
  const marketingMessages = [
    {
      title: '🌿 Plant More Trees, Create More Impact!',
      content: `
        <p style="color: #374151;">Every tree you plant makes a difference. Join thousands of others who are contributing to a greener India!</p>
        <p style="color: #374151;">Did you know that a single tree can absorb up to 22 kg of CO₂ per year? Imagine the impact when we plant together!</p>
      `,
      cta: 'Adopt More Trees',
      ctaLink: `${appUrl}/individuals`
    },
    {
      title: '🌳 Create a Forest for Your Special Moments',
      content: `
        <p style="color: #374151;">Celebrate birthdays, weddings, anniversaries, and more by creating a forest that grows with your memories!</p>
        <p style="color: #374151;">Share your forest with friends and family, and let them contribute to your green legacy.</p>
      `,
      cta: 'Create Your Forest',
      ctaLink: `${appUrl}/create-forest`
    },
    {
      title: '💚 Your Trees Are Growing Strong!',
      content: `
        <p style="color: #374151;">Your adopted trees are being cared for by our dedicated well-wishers and are growing beautifully!</p>
        <p style="color: #374151;">Check your dashboard to see the latest growth updates, planting photos, and location details.</p>
      `,
      cta: 'View Your Trees',
      ctaLink: `${appUrl}/dashboard/${userType}/trees`
    },
    {
      title: '🌱 Join the Green Revolution',
      content: `
        <p style="color: #374151;">Be part of India's green transformation! Every tree you adopt helps restore our environment and supports local communities.</p>
        <p style="color: #374151;">Together, we're building a sustainable future, one tree at a time.</p>
      `,
      cta: 'Start Planting',
      ctaLink: `${appUrl}/individuals`
    },
    {
      title: '🎁 Gift a Tree, Gift a Future',
      content: `
        <p style="color: #374151;">Looking for a meaningful gift? Give the gift of a greener future!</p>
        <p style="color: #374151;">Plant trees in someone's name for birthdays, anniversaries, or any special occasion. It's a gift that keeps growing!</p>
      `,
      cta: 'Send a Gift Tree',
      ctaLink: `${appUrl}/individuals`
    }
  ];
  
  // Select a random message (based on current date for consistency)
  const messageIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 10)) % marketingMessages.length;
  const message = marketingMessages[messageIndex];
  
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
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}! 👋</h2>
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

