#!/usr/bin/env node

/**
 * Direct script to send thank you emails with certificates for specific orders
 * This script directly uses nodemailer to send emails
 * Usage: node scripts/send-emails-direct.js ORDER_ID1 ORDER_ID2 ...
 */

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Load environment variables
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    fileContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          value = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Adoptrees';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
  console.error('❌ SMTP configuration not found');
  console.error('   Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local');
  process.exit(1);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    connectTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
  };

  return mongoose.connect(MONGODB_URI, opts);
}

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function createEmailTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

async function sendEmailWithCertificate(recipientEmail, recipientName, orderId, treesCount, certificateBuffer) {
  const displayName = recipientName || 'Friend';
  
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
          <h1 style="color: white; margin: 0; font-size: 21px;">🌳 Thank You! 🌳</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${displayName}!</h2>
          <p style="font-size: 12px; color: #374151;">Thank you for contributing to a <strong>Greener India</strong>! 🌿</p>
          <p style="color: #374151;">Your commitment to planting <strong>${treesCount} tree${treesCount > 1 ? 's' : ''}</strong> is making a real difference in our environment. Every tree you adopt helps:</p>
          <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
            <li>🌱 Combat climate change by absorbing CO₂</li>
            <li>💨 Produce clean oxygen for our planet</li>
            <li>🌍 Restore biodiversity and ecosystems</li>
            <li>🤝 Support local communities and farmers</li>
          </ul>
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1f2937; font-weight: 500;">📄 Your certificate is attached to this email!</p>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">Download and share your contribution certificate with pride.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/dashboard" 
               style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
              View Your Trees
            </a>
          </div>
          <p style="color: #6b7280; font-size: 11px; margin-top: 30px;">We'll keep you updated as your trees are planted and grow. Stay tuned for planting photos and location details!</p>
          <p style="color: #6b7280; font-size: 11px; margin-top: 20px;">Best regards,<br>The Adoptrees Team 🌿</p>
          <p style="color: #9ca3af; font-size: 9px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Order ID: ${orderId}
          </p>
        </div>
      </body>
    </html>
  `;

  const transporter = createEmailTransporter();
  
  // Validate certificate buffer
  if (!certificateBuffer || certificateBuffer.length === 0) {
    throw new Error('Certificate buffer is empty');
  }
  
  // Validate PDF header
  const pdfHeader = certificateBuffer.slice(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    throw new Error('Certificate buffer is not a valid PDF');
  }
  
  await transporter.sendMail({
    from: SMTP_FROM_EMAIL 
      ? `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`
      : SMTP_USER,
    to: recipientEmail,
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

async function main() {
  const orderIds = process.argv.slice(2);
  
  if (orderIds.length === 0) {
    console.error('❌ Please provide order IDs as arguments');
    console.error('Usage: node scripts/send-emails-direct.js ORDER_ID1 ORDER_ID2 ...');
    process.exit(1);
  }
  
  console.log('🔍 Connecting to database...');
  await connectDB();
  console.log('✅ Database connected\n');
  
  let Order;
  if (mongoose.models.Order) {
    Order = mongoose.model('Order');
  } else {
    Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  }
  
  console.log(`📋 Finding orders: ${orderIds.join(', ')}\n`);
  
  const orders = await Order.find({
    orderId: { $in: orderIds }
  })
    .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl certificate status paymentStatus createdAt')
    .lean();
  
  if (orders.length === 0) {
    console.error('❌ No orders found with the provided IDs');
    await mongoose.disconnect();
    process.exit(1);
  }
  
  console.log(`✅ Found ${orders.length} order(s)\n`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const order of orders) {
    try {
      console.log(`📧 Processing: ${order.orderId}`);
      
      const recipientEmail = order.isGift && order.giftRecipientEmail
        ? order.giftRecipientEmail
        : order.userEmail;
      const recipientName = order.isGift && order.giftRecipientName
        ? order.giftRecipientName
        : order.userName;
      
      if (!recipientEmail || !recipientEmail.includes('@')) {
        console.error(`   ❌ Invalid email: ${recipientEmail}`);
        results.failed++;
        results.errors.push({ orderId: order.orderId, error: 'Invalid email' });
        continue;
      }
      
      console.log(`   📧 Recipient: ${recipientName} (${recipientEmail})`);
      
      // Get certificate buffer
      let certificateBuffer = null;
      
      if (order.certificateUrl) {
        try {
          console.log(`   📥 Fetching certificate from Cloudinary...`);
          certificateBuffer = await fetchUrl(order.certificateUrl);
          console.log(`   ✅ Certificate fetched (${certificateBuffer.length} bytes)`);
        } catch (error) {
          console.warn(`   ⚠️  Failed to fetch from URL: ${error.message}`);
        }
      }
      
      if (!certificateBuffer) {
        try {
          console.log(`   📥 Loading certificate from database...`);
          const orderWithCert = await Order.findById(order._id).select('+certificate').lean();
          if (orderWithCert && orderWithCert.certificate) {
            certificateBuffer = orderWithCert.certificate;
            console.log(`   ✅ Certificate loaded from database (${certificateBuffer.length} bytes)`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to load from database: ${error.message}`);
        }
      }
      
      if (!certificateBuffer || certificateBuffer.length === 0) {
        console.log(`   ⚠️  Certificate not available. This script cannot regenerate certificates.`);
        console.log(`   💡 Please use one of these options:`);
        console.log(`      1. Start your dev server: npm run dev`);
        console.log(`      2. Then call: curl -X POST http://localhost:3000/api/admin/retry-email \\`);
        console.log(`         -H "Content-Type: application/json" \\`);
        console.log(`         -d '{"orderIds": ${JSON.stringify([order.orderId])}}'`);
        console.log(`      3. Or use the admin panel to retry emails`);
        results.failed++;
        results.errors.push({ orderId: order.orderId, error: 'Certificate not available - needs regeneration' });
        continue;
      }
      
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      console.log(`   📤 Sending email...`);
      
      await sendEmailWithCertificate(
        recipientEmail,
        recipientName,
        order.orderId,
        treesCount,
        certificateBuffer
      );
      
      console.log(`   ✅ Email sent successfully!\n`);
      results.success++;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      results.failed++;
      results.errors.push({ orderId: order.orderId, error: error.message });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully sent: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.forEach(({ orderId, error }) => {
      console.log(`   - ${orderId}: ${error}`);
    });
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Done!');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

