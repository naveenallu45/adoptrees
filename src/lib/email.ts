import nodemailer from 'nodemailer';
import { env } from './env';

// Create reusable transporter
const createTransporter = () => {
  // If SMTP is not configured, return null (for development)
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    const missingKeys = [
      !env.SMTP_HOST ? 'SMTP_HOST' : null,
      !env.SMTP_USER ? 'SMTP_USER' : null,
      !env.SMTP_PASSWORD ? 'SMTP_PASSWORD' : null,
    ].filter(Boolean);

    if (process.env.NODE_ENV === 'development') {
      console.warn(`SMTP not configured. Missing: ${missingKeys.join(', ')}. Email sending will be disabled.`);
    } else {
      console.error(`[EMAIL] SMTP is not configured. Missing: ${missingKeys.join(', ')}. No email will be sent.`);
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
    console.error('[EMAIL] Email not sent because SMTP transporter is unavailable:', {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  try {
    // Log attachment info for debugging
    if (options.attachments && options.attachments.length > 0) {
      console.log('[EMAIL] Sending email with attachments:', {
        to: options.to,
        subject: options.subject,
        attachmentCount: options.attachments.length,
        attachments: options.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.content instanceof Buffer ? att.content.length : typeof att.content
        }))
      });
    }
    
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
    
    console.log('[EMAIL] Email sent successfully:', { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    
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
          <h1 style="color: white; margin: 0; font-size: 21px;">Adoptrees</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
          <p>You have requested to reset your password. Use the following OTP to verify your identity:</p>
          <div style="background: white; border: 2px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 24px; font-weight: bold; color: #10b981; letter-spacing: 6px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 11px;">This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
          <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">Best regards,<br>The Adoptrees Team</p>
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

export async function sendWelcomeEmail(email: string, name: string, userType: 'individual' | 'company' | 'dealer'): Promise<boolean> {
  const displayName = name || (userType === 'company' || userType === 'dealer' ? 'Valued Customer' : 'Friend');
  
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
          <h1 style="color: white; margin: 0; font-size: 21px;">Welcome to Adoptrees!</h1>
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
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com'}/dashboard/${userType === 'dealer' ? 'company' : userType}/trees" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              Go to Dashboard
            </a>
          </div>
          <p style="color: #6b7280; font-size: 11px; margin-top: 30px;">If you have any questions, feel free to reach out to us. We're here to help!</p>
          <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
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
 * For dealer orders, includes dealer name and vehicle information
 */
export async function sendThankYouEmailWithCertificate(
  email: string,
  name: string,
  orderId: string,
  treesCount: number,
  certificateBuffer: Buffer,
  dealerInfo?: {
    dealerName?: string;
    showroomName?: string;
    vehicleName?: string;
  }
): Promise<boolean> {
  // Validate inputs
  if (!email || !email.includes('@')) {
    console.error('[EMAIL] Invalid email address:', email);
    return false;
  }
  
  if (!certificateBuffer || certificateBuffer.length === 0) {
    console.error('[EMAIL] Invalid certificate buffer for order:', orderId);
    return false;
  }
  
  // Validate certificate buffer is a valid PDF (starts with PDF header)
  const pdfHeader = certificateBuffer.slice(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    console.error('[EMAIL] Certificate buffer is not a valid PDF for order:', orderId);
    return false;
  }
  
  const displayName = name || 'Friend';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  // Check if this is a dealer order
  const isDealerOrder = !!(dealerInfo?.dealerName || dealerInfo?.showroomName);
  const dealerName = dealerInfo?.dealerName || dealerInfo?.showroomName || '';
  const vehicleName = dealerInfo?.vehicleName || '';
  
  // Customize email content for dealer orders
  let greetingMessage: string;
  let mainMessage: string;
  let subject: string;
  let occasionText: string = '';
  
  if (isDealerOrder) {
    // Format vehicle name as buying occasion
    if (vehicleName) {
      const capitalizedVehicle = vehicleName.charAt(0).toUpperCase() + vehicleName.slice(1).toLowerCase();
      occasionText = `Occasion of buying ${capitalizedVehicle}`;
    }
    
    const vehicleText = vehicleName ? ` with your ${vehicleName} purchase` : '';
    greetingMessage = `🎉 Congratulations on your new vehicle${vehicleText}! 🚗`;
    mainMessage = `<strong>${dealerName}</strong> has gifted you <strong>${treesCount} tree${treesCount > 1 ? 's' : ''}</strong> as a token of appreciation for choosing them as your trusted partner.${occasionText ? ` This tree adoption is for the <strong>${occasionText}</strong>.` : ''} This thoughtful gesture represents their commitment to environmental sustainability and your shared responsibility towards a greener future.`;
    subject = vehicleName 
      ? `🎁 Gift from ${dealerName} - Tree Adoption Certificate for Your ${vehicleName} 🌳`
      : `🎁 Gift from ${dealerName} - Tree Adoption Certificate 🌳`;
  } else {
    greetingMessage = 'Thank you for contributing to a <strong>Greener India</strong>! 🌿';
    mainMessage = `Your commitment to planting <strong>${treesCount} tree${treesCount > 1 ? 's' : ''}</strong> is making a real difference in our environment. Every tree you adopt helps:`;
    subject = 'Thank You for Contributing to a Greener India 🌳 - Your Certificate';
  }
  
  // Production-level HTML email template with table-based layout for maximum email client compatibility
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${isDealerOrder ? 'Gift Tree Certificate' : 'Thank You for Contributing to a Greener India'}</title>
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
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">
                      ${isDealerOrder ? '🎁 Gift Tree Certificate 🎁' : '🌳 Thank You! 🌳'}
                    </h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
                    <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 24px; font-weight: 600;">Hello ${displayName}!</h2>
                    
                    ${isDealerOrder ? `
                      <!-- Dealer Order Content -->
                      <!-- Congratulations Banner -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                        <tr>
                          <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);">
                            <p style="margin: 0; color: #92400e; font-weight: 700; font-size: 18px; line-height: 1.4;">${greetingMessage}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Main Message -->
                      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">${mainMessage}</p>
                      
                      ${vehicleName ? `
                        <!-- Vehicle Information Card -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                          <tr>
                            <td style="background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border: 2px solid #10b981; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.15);">
                              <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 700; font-size: 22px;">🚗 ${vehicleName}</p>
                              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Your vehicle purchase has contributed to a greener planet!</p>
                            </td>
                          </tr>
                        </table>
                      ` : ''}
                      
                      ${occasionText ? `
                        <!-- Occasion Information -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                          <tr>
                            <td style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
                              <p style="margin: 0 0 8px 0; color: #065f46; font-weight: 700; font-size: 16px;">${occasionText}</p>
                              <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">This tree adoption celebrates your vehicle purchase!</p>
                            </td>
                          </tr>
                        </table>
                      ` : ''}
                      
                      <!-- Dealer Information Card -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                        <tr>
                          <td style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);">
                            <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600; font-size: 16px;">🎁 Gifted by: <strong style="color: #6b21a8;">${dealerName}</strong></p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">This tree adoption is a special gift from your dealer as a token of appreciation.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Impact Information -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                        <tr>
                          <td style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #3b82f6; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 700; font-size: 16px; text-align: center;">🌿 Your Environmental Impact</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="text-align: center; padding: 10px;">
                                  <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">${treesCount}</p>
                                  <p style="margin: 5px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Tree${treesCount > 1 ? 's' : ''} Adopted</p>
                                </td>
                                <td style="text-align: center; padding: 10px;">
                                  <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">💨</p>
                                  <p style="margin: 5px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Oxygen Produced</p>
                                </td>
                                <td style="text-align: center; padding: 10px;">
                                  <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">🌍</p>
                                  <p style="margin: 5px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">CO₂ Absorbed</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    ` : `
                      <!-- Regular Order Content -->
                      <p style="font-size: 16px; color: #374151; line-height: 1.8; margin-bottom: 20px;">${greetingMessage}</p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">${mainMessage}</p>
                      <ul style="color: #374151; line-height: 1.8; padding-left: 20px; margin-bottom: 25px; font-size: 15px;">
                        <li style="margin-bottom: 10px;">🌱 Combat climate change by absorbing CO₂</li>
                        <li style="margin-bottom: 10px;">💨 Produce clean oxygen for our planet</li>
                        <li style="margin-bottom: 10px;">🌍 Restore biodiversity and ecosystems</li>
                        <li style="margin-bottom: 10px;">🤝 Support local communities and farmers</li>
                      </ul>
                    `}
                    
                    <!-- Certificate Information -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
                          <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600; font-size: 16px;">📄 Your Certificate is Attached!</p>
                          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Download and share your contribution certificate with pride. This certificate validates your commitment to environmental sustainability.</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}/dashboard" 
                             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                            View Your Trees
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Additional Information -->
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">We'll keep you updated as your trees are planted and grow. Stay tuned for planting photos and location details!</p>
                    
                    <!-- Closing -->
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                      Best regards,<br>
                      <strong style="color: #10b981;">The Adoptrees Team</strong> 🌿
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.6; text-align: center;">
                      Order ID: ${orderId}${isDealerOrder ? ` | Gifted by: ${dealerName}${vehicleName ? ` | Vehicle: ${vehicleName}` : ''}` : ''}
                    </p>
                    <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 10px; line-height: 1.6; text-align: center;">
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

  try {
    console.log('[EMAIL] Sending thank you email with certificate:', {
      to: email,
      orderId,
      certificateSize: certificateBuffer.length,
      treesCount
    });
    
    // Ensure certificate buffer is a proper Buffer instance
    const pdfBuffer = Buffer.isBuffer(certificateBuffer) 
      ? certificateBuffer 
      : Buffer.from(certificateBuffer);
    
    const emailSent = await sendEmail({
      to: email,
      subject: subject,
      html,
      attachments: [
        {
          filename: `Adoptrees_Certificate_${orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    
    if (emailSent) {
      console.log('[EMAIL] Thank you email sent successfully:', { to: email, orderId });
    } else {
      console.error('[EMAIL] Failed to send thank you email:', { to: email, orderId });
    }
    
    return emailSent;
  } catch (error) {
    console.error('[EMAIL] Error in sendThankYouEmailWithCertificate:', error);
    if (error instanceof Error) {
      console.error('[EMAIL] Error details:', {
        message: error.message,
        stack: error.stack,
        orderId,
        email
      });
    }
    return false;
  }
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
      ${img.caption ? `<p style="color: #6b7280; font-size: 9px; margin-top: 5px; text-align: center;">${img.caption}</p>` : ''}
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
          <h1 style="color: white; margin: 0; font-size: 21px;">🌱 Your Tree Has Been Planted! 🌱</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 12px; color: #374151;">Great news! Your <strong>${quantity} ${treeName} tree${quantity > 1 ? 's have' : ' has'} been successfully planted</strong>! 🎉</p>
          <p style="color: #374151;">Our well-wisher has carefully planted your tree${quantity > 1 ? 's' : ''} and captured the moment for you. Here are the planting photos:</p>
          
          ${imagesHtml}
          
          ${plantingNotes ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 500;">📝 Planting Notes:</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">${plantingNotes}</p>
            </div>
          ` : ''}
          
          ${plantingLocation ? `
            <div style="background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 14px;">📍 Planting Location</h3>
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
          <p style="color: #6b7280; font-size: 11px; margin-top: 30px;">We'll send you regular growth updates as your tree${quantity > 1 ? 's' : ''} continue${quantity > 1 ? '' : 's'} to grow and thrive!</p>
          <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
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
      ${img.caption ? `<p style="color: #6b7280; font-size: 9px; margin-top: 5px; text-align: center;">${img.caption}</p>` : ''}
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
          <h1 style="color: white; margin: 0; font-size: 21px;">🌳 Growth Update! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 12px; color: #374151;">Your <strong>${treeName} tree${quantity > 1 ? 's are' : ' is'} growing beautifully</strong>! 🌿</p>
          ${daysSincePlanting ? `<p style="color: #6b7280; font-size: 11px;">It's been <strong>${daysSincePlanting} day${daysSincePlanting > 1 ? 's' : ''}</strong> since planting.</p>` : ''}
          <p style="color: #374151;">Here's the latest update on your tree${quantity > 1 ? 's' : ''} with fresh photos:</p>
          
          ${imagesHtml}
          
          ${notes ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 500;">📝 Update Notes:</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">${notes}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View All Updates
            </a>
          </div>
          <p style="color: #6b7280; font-size: 11px; margin-top: 30px;">We'll continue to send you regular updates as your tree${quantity > 1 ? 's' : ''} grow${quantity > 1 ? '' : 's'} and thrive!</p>
          <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
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
export function getMarketingEmailTemplate(
  templateId: string, 
  displayName: string, 
  userType: 'individual' | 'company' | 'dealer', 
  appUrl: string,
  couponCode?: string,
  discount?: number,
  discountType?: 'percentage' | 'amount'
) {
  // Individual user templates
  const individualTemplates: Record<string, { title: string; content: string; cta: string; ctaLink: string }> = {
    'adopt-trees': {
      title: '🌿 Plant More Trees, Create More Impact!',
      content: `
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Every tree you plant makes a difference. Join thousands contributing to a greener India!</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The best time to plant a tree was 20 years ago. The second best time is now."</p>
          <p style="margin: 0; color: #047857; font-size: 11px; text-align: center;">— Chinese Proverb</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Celebrate life's precious moments with a forest that grows with your memories. Perfect for birthdays, weddings, anniversaries, or any milestone.</p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
          <p style="margin: 0 0 15px 0; color: #92400e; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"A society grows great when old men plant trees whose shade they know they shall never sit in."</p>
          <p style="margin: 0; color: #78350f; font-size: 11px; text-align: center;">— Greek Proverb</p>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde047; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #854d0e; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Great news! Your trees are thriving and making a real impact. Check your dashboard for latest growth updates, photos, and location details.</p>
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">
          <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves and to one another."</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 11px; text-align: center;">— Mahatma Gandhi</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #1e3a8a; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Be part of India's green transformation! Every tree helps restore our environment and supports local communities.</p>
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic;">"He who plants a tree plants a hope."</p>
          <p style="margin: 0; color: #047857; font-size: 11px;">— Lucy Larcom</p>
        </div>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #065f46; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Give the gift of a greener future! Plant trees in someone's name for birthdays, anniversaries, or any special occasion. A gift that keeps growing!</p>
        <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(236, 72, 153, 0.1);">
          <p style="margin: 0 0 15px 0; color: #9f1239; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The gift of a tree is the gift of life itself."</p>
          <p style="margin: 0; color: #831843; font-size: 11px; text-align: center;">— Unknown</p>
        </div>
        <div style="background: #fdf2f8; border: 1px solid #f9a8d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #831843; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Thank you for creating a greener India! Your tree adoptions are making a measurable difference.</p>
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"In every walk with nature, one receives far more than he seeks."</p>
          <p style="margin: 0 0 20px 0; color: #047857; font-size: 14px; text-align: center;">— John Muir</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🌳</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Trees Planted</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">💨</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Oxygen Produced</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🌍</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">CO₂ Absorbed</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🤝</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Communities</p>
            </div>
          </div>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 15px;">Dear ${displayName},</p>
        <p style="color: #374151; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">Your forest is growing beautifully! Every tree is part of a living ecosystem making a real difference.</p>
        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);">
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The creation of a thousand forests is in one acorn."</p>
          <p style="margin: 0; color: #047857; font-size: 11px; text-align: center;">— Ralph Waldo Emerson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"Christmas is the spirit of giving without a thought of getting."</p>
          <p style="margin: 0; color: #4b5563; font-size: 11px; text-align: center;">— Thomas S. Monson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The New Year stands before us, like a chapter in a book, waiting to be written."</p>
          <p style="margin: 0; color: #334155; font-size: 11px; text-align: center;">— Melody Beattie</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"Businesses that are good stewards of the environment are also good stewards of their bottom line."</p>
          <p style="margin: 0; color: #047857; font-size: 11px; text-align: center;">— Unknown</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #92400e; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The greatest threat to our planet is the belief that someone else will save it."</p>
          <p style="margin: 0; color: #78350f; font-size: 11px; text-align: center;">— Robert Swan</p>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde047; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #854d0e; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"Sustainability is no longer about doing less harm. It's about doing more good."</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 11px; text-align: center;">— Jochen Zeitz</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #1e3a8a; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic;">"The business of business should not be about money. It should be about responsibility."</p>
          <p style="margin: 0; color: #047857; font-size: 11px;">— Anita Roddick</p>
        </div>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #065f46; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #9f1239; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The way to get started is to quit talking and begin doing."</p>
          <p style="margin: 0; color: #831843; font-size: 11px; text-align: center;">— Walt Disney</p>
        </div>
        <div style="background: #fdf2f8; border: 1px solid #f9a8d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #831843; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"We do not inherit the earth from our ancestors; we borrow it from our children."</p>
          <p style="margin: 0 0 20px 0; color: #047857; font-size: 14px; text-align: center;">— Native American Proverb</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🌳</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Trees Planted</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">💨</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Oxygen Produced</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🌍</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">CO₂ Offset</p>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700; line-height: 1;">🤝</p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px; font-weight: 600;">Communities</p>
            </div>
          </div>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 15px 0; color: #065f46; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The environment is where we all meet; where we all have a mutual interest; it is the one thing all of us share."</p>
          <p style="margin: 0; color: #047857; font-size: 11px; text-align: center;">— Lady Bird Johnson</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"At Christmas, all roads lead home."</p>
          <p style="margin: 0; color: #4b5563; font-size: 11px; text-align: center;">— Marjorie Holmes</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
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
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: 600; font-size: 12px; font-style: italic; text-align: center;">"The future depends on what you do today."</p>
          <p style="margin: 0; color: #334155; font-size: 11px; text-align: center;">— Mahatma Gandhi</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; color: #166534; font-size: 11px; line-height: 1.6;">
            🌱 <strong>New Year Action:</strong> Launch a company-wide tree adoption drive and share impact in your annual ESG report.
          </p>
        </div>
      `,
      cta: 'Start New Year Tree Program',
      ctaLink: `${appUrl}/companies?campaign=new-year`
    }
  };

  // Return template based on user type
  // Dealers use company templates for marketing emails
  const templates = (userType === 'company' || userType === 'dealer') ? companyTemplates : individualTemplates;
  const baseTemplate = templates[templateId] || templates['adopt-trees'];
  
  // Add coupon information to content if provided
  let couponSection = '';
  if (couponCode && discount !== undefined && discountType) {
    const discountDisplay = discountType === 'percentage' 
      ? `${discount}% OFF` 
      : `₹${discount} OFF`;
    
    couponSection = `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; padding: 19px; margin: 19px 0; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);">
        <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 700; font-size: 14px; letter-spacing: 0.4px;">
          🎉 SPECIAL OFFER 🎉
        </p>
        <p style="margin: 0 0 11px 0; color: #78350f; font-size: 18px; font-weight: 700;">
          ${discountDisplay}
        </p>
        <p style="margin: 0 0 11px 0; color: #92400e; font-size: 12px; font-weight: 600;">
          Use Coupon Code:
        </p>
        <div style="background: #ffffff; border: 2px dashed #f59e0b; padding: 9px 15px; margin: 0 auto 11px; border-radius: 8px; display: inline-block;">
          <p style="margin: 0; color: #78350f; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; font-family: 'Courier New', monospace;">
            ${couponCode}
          </p>
        </div>
        <p style="margin: 0; color: #78350f; font-size: 11px; line-height: 1.5;">
          Apply this code at checkout to get your discount!
        </p>
      </div>
    `;
  }
  
  // Update CTA link to include coupon code if provided
  const ctaLinkWithCoupon = couponCode 
    ? `${baseTemplate.ctaLink}${baseTemplate.ctaLink.includes('?') ? '&' : '?'}coupon=${couponCode}`
    : baseTemplate.ctaLink;
  
  // Update title to highlight coupon code if provided
  let updatedTitle = baseTemplate.title;
  if (couponCode && discount !== undefined && discountType) {
    const discountDisplay = discountType === 'percentage' 
      ? `${discount}% OFF` 
      : `₹${discount} OFF`;
    // Highlight coupon code in subject: Use emoji and make it prominent
    updatedTitle = `${baseTemplate.title} 🎉 ${discountDisplay} | Use Code: ${couponCode}`;
  }
  
  return {
    ...baseTemplate,
    title: updatedTitle,
    content: baseTemplate.content + couponSection,
    ctaLink: ctaLinkWithCoupon
  };
}

/**
 * Send marketing email to registered users
 * This email is sent every 10 days to keep users engaged
 */
export async function sendMarketingEmail(
  email: string,
  name: string,
  userType: 'individual' | 'company' | 'dealer',
  templateId?: string,
  couponCode?: string,
  discount?: number,
  discountType?: 'percentage' | 'amount'
): Promise<boolean> {
  const displayName = name || (userType === 'company' || userType === 'dealer' ? 'Valued Customer' : 'Friend');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  
  // Use provided template or rotate between different marketing messages
  let message;
  if (templateId) {
    message = getMarketingEmailTemplate(templateId, displayName, userType, appUrl, couponCode, discount, discountType);
  } else {
    // Rotate between different marketing messages for automated emails
    const marketingMessages = [
      getMarketingEmailTemplate('adopt-trees', displayName, userType, appUrl, couponCode, discount, discountType),
      getMarketingEmailTemplate('create-forest', displayName, userType, appUrl, couponCode, discount, discountType),
      getMarketingEmailTemplate('tree-growth', displayName, userType, appUrl, couponCode, discount, discountType),
      getMarketingEmailTemplate('green-revolution', displayName, userType, appUrl, couponCode, discount, discountType),
      getMarketingEmailTemplate('gift-tree', displayName, userType, appUrl, couponCode, discount, discountType)
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
                    <h1 style="color: #ffffff; margin: 0; font-size: 21px; font-weight: 700; line-height: 1.2;">${message.title}</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
          ${message.content}
                    
                    <!-- Inspirational Quote Section -->
                    <div style="background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); border-left: 4px solid #10b981; padding: 18px 20px; margin: 30px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                      <p style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600; font-size: 12px;">💡 Inspiration</p>
                      <p style="margin: 0; color: #6b7280; font-size: 11px; line-height: 1.6; font-style: italic;">
                        ${(userType === 'company' || userType === 'dealer')
                          ? '"The future belongs to those who understand that doing more with less is compassionate, prosperous, and enduring." — Paul Hawken'
                          : '"The Earth does not belong to us; we belong to the Earth. All things are connected." — Chief Seattle'
                        }
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
            <a href="${message.ctaLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
              ${message.cta}
            </a>
          </div>
                    
                    <!-- Impact Section -->
                    <div style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border: 1px solid #7dd3fc; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #0c4a6e; font-size: 11px; line-height: 1.6;">
                        <strong>📊 ${(userType === 'company' || userType === 'dealer') ? 'Corporate Impact:' : 'Your Impact:'}</strong> 
                        ${(userType === 'company' || userType === 'dealer')
                          ? 'Every tree your company adopts contributes to ESG compliance, carbon offset goals, and demonstrates environmental leadership. Thank you for being part of India\'s corporate green movement!'
                          : 'Every tree you adopt contributes to cleaner air, restored ecosystems, and a healthier planet. Thank you for being part of this green movement!'
                        }
            </p>
          </div>
                    
                    <!-- Closing -->
                    <p style="color: #6b7280; font-size: 11px; line-height: 1.6; margin-top: 30px;">
                      If you have any questions or need assistance, feel free to reach out to us. We're here to help!
                    </p>
                    <p style="color: #6b7280; font-size: 11px; line-height: 1.6; margin-top: 20px;">
                      Best regards,<br>
                      <strong style="color: #10b981;">The Adoptrees Team</strong> 🌿
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 9px; line-height: 1.6; text-align: center;">
            You're receiving this email because you're a registered member of Adoptrees.<br>
                      <a href="${appUrl}/dashboard/${userType}/settings" style="color: #6b7280; text-decoration: underline;">Manage your email preferences</a> | 
                      <a href="${appUrl}" style="color: #6b7280; text-decoration: underline;">Visit Adoptrees</a>
                    </p>
                    <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 8px; line-height: 1.6; text-align: center;">
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
    
    return `
      <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">Task ${index + 1}: ${task.task}</p>
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

/**
 * Get occasion-specific email template content
 */
function getOccasionTemplate(
  occasion: string | undefined,
  displayName: string,
  senderName: string,
  treeName: string,
  quantity: number,
  giftMessage?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
  const treeText = `${quantity} ${treeName} tree${quantity > 1 ? 's' : ''}`;
  
  const templates: Record<string, {
    title: string;
    headerEmoji: string;
    greeting: string;
    mainMessage: string;
    highlightBox: { title: string; subtitle: string };
    closingMessage: string;
    subject: string;
  }> = {
    birthday: {
      title: '🎂 Happy Birthday! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎂🎁',
      greeting: `Happy Birthday, ${displayName}! 🎉`,
      mainMessage: `<strong>${senderName}</strong> has sent you a special birthday gift - ${treeText} that will be planted in your name! What better way to celebrate another year than with a gift that grows and gives back to our planet?`,
      highlightBox: {
        title: '🌱 A Birthday Tree in Your Name! 🌱',
        subtitle: 'This tree will grow year after year, just like you! A living gift that celebrates your special day and helps our planet.'
      },
      closingMessage: 'May your special day be as wonderful as the positive impact this tree will make! Happy Birthday!',
      subject: `🎂 ${senderName} Sent You a Birthday Gift Tree! 🌳`
    },
    anniversary: {
      title: '💕 Happy Anniversary! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '💕🌳',
      greeting: `Happy Anniversary, ${displayName}! 💖`,
      mainMessage: `<strong>${senderName}</strong> has sent you a beautiful anniversary gift - ${treeText} planted in your name! A symbol of love that grows stronger with time, just like your relationship.`,
      highlightBox: {
        title: '🌱 An Anniversary Tree in Your Name! 🌱',
        subtitle: 'This tree represents love that grows and endures, creating lasting memories and a greener future.'
      },
      closingMessage: 'Wishing you many more years of happiness together, and a beautiful tree that will grow alongside your love!',
      subject: `💕 ${senderName} Sent You an Anniversary Gift Tree! 🌳`
    },
    wedding: {
      title: '💒 Congratulations! You\'ve Received a Wedding Gift Tree! 🌳',
      headerEmoji: '💒🌳',
      greeting: `Congratulations, ${displayName}! 💐`,
      mainMessage: `<strong>${senderName}</strong> has sent you a wonderful wedding gift - ${treeText} that will be planted in your name! A beautiful way to celebrate your new beginning with a gift that grows and flourishes.`,
      highlightBox: {
        title: '🌱 A Wedding Tree in Your Name! 🌱',
        subtitle: 'Just like your marriage, this tree will grow strong roots and flourish for years to come, creating a lasting legacy.'
      },
      closingMessage: 'May your marriage be as strong and beautiful as this tree, growing stronger with each passing year! Congratulations!',
      subject: `💒 ${senderName} Sent You a Wedding Gift Tree! 🌳`
    },
    graduation: {
      title: '🎓 Congratulations! You\'ve Received a Graduation Gift Tree! 🌳',
      headerEmoji: '🎓🌳',
      greeting: `Congratulations on Your Graduation, ${displayName}! 🎉`,
      mainMessage: `<strong>${senderName}</strong> has sent you a special graduation gift - ${treeText} planted in your name! A perfect way to celebrate your achievements with a gift that grows and makes a difference.`,
      highlightBox: {
        title: '🌱 A Graduation Tree in Your Name! 🌱',
        subtitle: 'Just like you\'ve grown and achieved great things, this tree will grow and contribute to a better future for all.'
      },
      closingMessage: 'Congratulations on this milestone! May your future be as bright and promising as the positive impact this tree will make!',
      subject: `🎓 ${senderName} Sent You a Graduation Gift Tree! 🌳`
    },
    festival: {
      title: '🎊 Festival Greetings! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎊🌳',
      greeting: `Festival Greetings, ${displayName}! 🎉`,
      mainMessage: `<strong>${senderName}</strong> has sent you a festive gift - ${treeText} that will be planted in your name! A meaningful way to celebrate the festival season with a gift that brings joy and helps our planet.`,
      highlightBox: {
        title: '🌱 A Festival Tree in Your Name! 🌱',
        subtitle: 'This tree celebrates the spirit of the festival - growth, prosperity, and blessings for a greener future.'
      },
      closingMessage: 'Wishing you a joyous festival season filled with happiness, and a beautiful tree that will grow and flourish!',
      subject: `🎊 ${senderName} Sent You a Festival Gift Tree! 🌳`
    },
    'thank-you': {
      title: '🙏 Thank You! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🙏🌳',
      greeting: `Hello ${displayName}! 👋`,
      mainMessage: `<strong>${senderName}</strong> has sent you a thoughtful thank you gift - ${treeText} planted in your name! A beautiful way to express gratitude with a gift that grows and gives back.`,
      highlightBox: {
        title: '🌱 A Thank You Tree in Your Name! 🌱',
        subtitle: 'This tree represents appreciation and gratitude, growing stronger each day and making a positive impact.'
      },
      closingMessage: 'Thank you for being wonderful! This tree will continue to grow as a symbol of appreciation and care for our planet.',
      subject: `🙏 ${senderName} Sent You a Thank You Gift Tree! 🌳`
    },
    congratulations: {
      title: '🎉 Congratulations! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎉🌳',
      greeting: `Congratulations, ${displayName}! 🎊`,
      mainMessage: `<strong>${senderName}</strong> has sent you a congratulatory gift - ${treeText} that will be planted in your name! A wonderful way to celebrate your success with a gift that grows and makes a difference.`,
      highlightBox: {
        title: '🌱 A Congratulations Tree in Your Name! 🌱',
        subtitle: 'This tree celebrates your achievements and will continue to grow, just like your success story!'
      },
      closingMessage: 'Congratulations on your achievement! May your success continue to grow, just like this beautiful tree!',
      subject: `🎉 ${senderName} Sent You a Congratulations Gift Tree! 🌳`
    },
    'get-well': {
      title: '💚 Get Well Soon! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '💚🌳',
      greeting: `Get Well Soon, ${displayName}! 💚`,
      mainMessage: `<strong>${senderName}</strong> has sent you a healing gift - ${treeText} planted in your name! A thoughtful way to wish you a speedy recovery with a gift that grows and brings fresh air.`,
      highlightBox: {
        title: '🌱 A Get Well Tree in Your Name! 🌱',
        subtitle: 'This tree represents healing and growth, bringing fresh air and positive energy to help you feel better soon.'
      },
      closingMessage: 'Wishing you a speedy recovery! May this tree bring you fresh air and positive energy as you heal!',
      subject: `💚 ${senderName} Sent You a Get Well Gift Tree! 🌳`
    },
    'new-baby': {
      title: '👶 Congratulations! You\'ve Received a Baby Gift Tree! 🌳',
      headerEmoji: '👶🌳',
      greeting: `Congratulations on Your New Baby, ${displayName}! 🎉`,
      mainMessage: `<strong>${senderName}</strong> has sent you a special baby gift - ${treeText} that will be planted in your name! A beautiful way to welcome your little one with a gift that grows alongside them.`,
      highlightBox: {
        title: '🌱 A Baby Gift Tree in Your Name! 🌱',
        subtitle: 'This tree will grow alongside your baby, creating a beautiful connection between new life and nature\'s gift.'
      },
      closingMessage: 'Congratulations on your new bundle of joy! May this tree grow strong and healthy, just like your little one!',
      subject: `👶 ${senderName} Sent You a Baby Gift Tree! 🌳`
    },
    retirement: {
      title: '🎊 Congratulations on Your Retirement! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎊🌳',
      greeting: `Congratulations on Your Retirement, ${displayName}! 🎉`,
      mainMessage: `<strong>${senderName}</strong> has sent you a retirement gift - ${treeText} planted in your name! A meaningful way to celebrate this milestone with a gift that grows and creates a lasting legacy.`,
      highlightBox: {
        title: '🌱 A Retirement Tree in Your Name! 🌱',
        subtitle: 'This tree represents your legacy and the new chapter ahead, growing strong and creating a lasting impact.'
      },
      closingMessage: 'Congratulations on your retirement! May this tree grow and flourish, just like the wonderful new chapter ahead of you!',
      subject: `🎊 ${senderName} Sent You a Retirement Gift Tree! 🌳`
    },
    christmas: {
      title: '🎄 Merry Christmas! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎄🌳',
      greeting: `Merry Christmas, ${displayName}! 🎅`,
      mainMessage: `<strong>${senderName}</strong> has sent you a Christmas gift - ${treeText} that will be planted in your name! A wonderful way to celebrate the season of giving with a gift that grows and helps our planet.`,
      highlightBox: {
        title: '🌱 A Christmas Tree in Your Name! 🌱',
        subtitle: 'This tree celebrates the spirit of Christmas - giving, growth, and creating a better world for all.'
      },
      closingMessage: 'Merry Christmas! May this tree bring you joy and peace, and help create a greener future for generations to come!',
      subject: `🎄 ${senderName} Sent You a Christmas Gift Tree! 🌳`
    },
    diwali: {
      title: '🪔 Happy Diwali! You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🪔🌳',
      greeting: `Happy Diwali, ${displayName}! 🪔`,
      mainMessage: `<strong>${senderName}</strong> has sent you a Diwali gift - ${treeText} that will be planted in your name! A beautiful way to celebrate the festival of lights with a gift that brings light and life to our planet.`,
      highlightBox: {
        title: '🌱 A Diwali Tree in Your Name! 🌱',
        subtitle: 'This tree celebrates the festival of lights, bringing prosperity, growth, and blessings for a brighter future.'
      },
      closingMessage: 'Happy Diwali! May this tree bring you prosperity, happiness, and a greener, brighter future!',
      subject: `🪔 ${senderName} Sent You a Diwali Gift Tree! 🌳`
    },
    other: {
      title: '🎁 You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎁🌳',
      greeting: `Hello ${displayName}! 👋`,
      mainMessage: `<strong>${senderName}</strong> has sent you a thoughtful gift - ${treeText} that will be planted in your name! A beautiful way to show you care with a gift that grows and makes a positive impact.`,
      highlightBox: {
        title: '🌱 A Gift Tree in Your Name! 🌱',
        subtitle: 'This tree represents thoughtfulness and care, growing stronger each day and making a positive impact on our planet.'
      },
      closingMessage: 'This is a thoughtful gift that will make a lasting impact. Thank you for being part of our mission to create a greener future!',
      subject: `🎁 ${senderName} Sent You a Gift Tree! 🌳`
    },
    default: {
      title: '🎁 You\'ve Received a Gift Tree! 🌳',
      headerEmoji: '🎁🌳',
      greeting: `Hello ${displayName}! 👋`,
      mainMessage: `<strong>${senderName}</strong> has sent you a beautiful gift - ${treeText} that will be planted in your name!`,
      highlightBox: {
        title: '🌱 A Tree Has Been Adopted in Your Name! 🌱',
        subtitle: 'This is a gift that will grow and make a positive impact on our planet.'
      },
      closingMessage: 'This is a thoughtful gift that will make a lasting impact. Thank you for being part of our mission to create a greener future!',
      subject: `🎁 ${senderName} Sent You a Gift Tree! 🌳`
    }
  };

  const template = templates[occasion || ''] || templates.default;
  
  return {
    ...template,
    giftMessage,
    appUrl,
    treeText
  };
}

/**
 * Send greeting email to gift recipient after adoption
 */
export async function sendGiftRecipientGreetingEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  treeName: string,
  quantity: number,
  giftMessage?: string,
  occasion?: string
): Promise<boolean> {
  const displayName = recipientName || 'Friend';
  const template = getOccasionTemplate(occasion, displayName, senderName, treeName, quantity, giftMessage);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${template.headerEmoji} ${template.title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${template.greeting}</h2>
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            ${template.mainMessage}
            ${giftMessage ? ` Along with this gift, ${senderName} has included a personal message for you below.` : ''}
          </p>
          
          ${giftMessage ? `
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 24px;">💌</span>
                <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 16px;">Personal Message from ${senderName}</p>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; font-style: italic;">"${giftMessage}"</p>
              </div>
            </div>
          ` : ''}
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 700;">${template.highlightBox.title}</p>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 14px;">${template.highlightBox.subtitle}</p>
          </div>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">🌿 What happens next?</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Your ${template.treeText} will be planted by our team of well-wishers</li>
              <li>You'll receive updates as your tree${quantity > 1 ? 's' : ''} grow${quantity > 1 ? '' : 's'}</li>
              <li>Your ${template.treeText} will contribute to cleaner air and a greener environment</li>
              <li>You can track the progress and see where your tree${quantity > 1 ? 's' : ''} ${quantity > 1 ? 'are' : 'is'} planted</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${template.appUrl}" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              Learn More About Adoptrees
            </a>
          </div>
          
          <p style="color: #374151; font-size: 16px; margin-top: 25px;">${template.closingMessage}</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The Adoptrees Team 🌿</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html,
  });
}

export async function sendEcoFriendRequestEmail({
  to,
  receiverName,
  requesterName,
  communityUrl,
}: {
  to: string;
  receiverName: string;
  requesterName: string;
  communityUrl: string;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Eco Friend</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 26px;">Eco Community</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${receiverName},</h2>
          <p style="font-size: 16px; color: #374151;">
            ${requesterName} added you as an Eco Friend on Adoptrees.
          </p>
          <p style="font-size: 16px; color: #374151;">
            You can now find them in your Eco Friends list and start chatting about your green journey.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${communityUrl}"
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Eco Community
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            If you do not recognize this update, you can simply ignore this email.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Best regards,<br>The Adoptrees Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${requesterName} added you as an Eco Friend`,
    html,
  });
}

export async function sendEcoFriendAddedConfirmationEmail({
  to,
  userName,
  friendName,
  communityUrl,
}: {
  to: string;
  userName: string;
  friendName: string;
  communityUrl: string;
}): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Eco Friend Added</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 26px;">Eco Community</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${userName},</h2>
          <p style="font-size: 16px; color: #374151;">
            You added ${friendName} as an Eco Friend on Adoptrees.
          </p>
          <p style="font-size: 16px; color: #374151;">
            You can now open your Eco Friends list and start chatting with them.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${communityUrl}"
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Open Eco Friends
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Best regards,<br>The Adoptrees Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `You added ${friendName} as an Eco Friend`,
    html,
  });
}

function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEcoChatMessageEmail({
  to,
  receiverName,
  senderName,
  messageBody,
  communityUrl,
}: {
  to: string;
  receiverName: string;
  senderName: string;
  messageBody: string;
  communityUrl: string;
}): Promise<boolean> {
  const safeMessage = escapeEmailHtml(messageBody).replace(/\n/g, '<br>');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Eco Community Message</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 26px;">Eco Community</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${escapeEmailHtml(receiverName)},</h2>
          <p style="font-size: 16px; color: #374151;">
            ${escapeEmailHtml(senderName)} sent you a new Eco Community message.
          </p>
          <div style="background: white; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #1f2937; font-size: 15px;">${safeMessage}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${communityUrl}"
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Reply in Eco Community
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Best regards,<br>The Adoptrees Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `New Eco Community message from ${senderName}`,
    html,
  });
}

