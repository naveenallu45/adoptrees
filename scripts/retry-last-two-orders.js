#!/usr/bin/env node

/**
 * Quick script to retry emails for the last two orders
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
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

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  
  // Dynamically import the modules (they're ES modules)
  const { default: Order } = await import('../src/models/Order.js');
  const { default: User } = await import('../src/models/User.js');
  const { sendThankYouEmailWithCertificate } = await import('../src/lib/email.js');
  const { generateCertificate } = await import('../src/lib/certificate.js');
  const { logPaymentEvent, logError } = await import('../src/lib/logger.js');
  
  // Find last two paid orders
  console.log('🔍 Finding last two paid orders...\n');
  
  const orders = await Order.find({
    paymentStatus: 'paid',
    status: { $in: ['confirmed', 'planted', 'completed'] }
  })
    .sort({ createdAt: -1 })
    .limit(2)
    .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl certificate status paymentStatus createdAt')
    .lean();
  
  if (orders.length === 0) {
    console.log('❌ No paid orders found');
    await mongoose.disconnect();
    process.exit(0);
  }
  
  console.log(`📋 Found ${orders.length} order(s):\n`);
  orders.forEach((order, index) => {
    console.log(`${index + 1}. Order ID: ${order.orderId}`);
    console.log(`   User: ${order.userName} (${order.userEmail})`);
    console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
    console.log(`   Has Certificate: ${!!(order.certificate || order.certificateUrl)}\n`);
  });
  
  console.log('🚀 Starting email retry...\n');
  
  for (const order of orders) {
    try {
      console.log(`📧 Processing: ${order.orderId}`);
      
      // Determine recipient
      const recipientEmail = order.isGift && order.giftRecipientEmail
        ? order.giftRecipientEmail
        : order.userEmail;
      const recipientName = order.isGift && order.giftRecipientName
        ? order.giftRecipientName
        : order.userName;
      
      if (!recipientEmail || !recipientEmail.includes('@')) {
        console.error(`   ❌ Invalid email: ${recipientEmail}`);
        continue;
      }
      
      // Get certificate buffer
      let certificateBuffer = null;
      
      // Try Cloudinary URL first
      if (order.certificateUrl) {
        try {
          console.log(`   📥 Fetching certificate from Cloudinary...`);
          const response = await fetch(order.certificateUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            certificateBuffer = Buffer.from(arrayBuffer);
            console.log(`   ✅ Certificate fetched (${certificateBuffer.length} bytes)`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to fetch from URL: ${error.message}`);
        }
      }
      
      // Fallback: Load from database
      if (!certificateBuffer) {
        try {
          console.log(`   📥 Loading certificate from database...`);
          const orderWithCert = await Order.findById(order._id).select('+certificate').lean();
          if (orderWithCert && orderWithCert.certificate) {
            certificateBuffer = orderWithCert.certificate;
            console.log(`   ✅ Certificate loaded (${certificateBuffer.length} bytes)`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to load from database: ${error.message}`);
        }
      }
      
      // Generate if needed
      if (!certificateBuffer || certificateBuffer.length === 0) {
        console.log(`   🔨 Generating new certificate...`);
        const user = await User.findById(order.userId).select('publicId qrCode image name companyName userType');
        
        if (!user || !user.publicId) {
          console.error(`   ❌ User not found or missing publicId`);
          continue;
        }
        
        const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
        const co2Kgs = order.items.reduce((sum, item) => {
          const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null)
            ? item.co2Kgs * item.quantity
            : (item.oxygenKgs * 0.715) * item.quantity;
          return sum + itemCo2;
        }, 0);
        
        const treeNames = [];
        order.items.forEach((item) => {
          if (!treeNames.includes(item.treeName)) {
            treeNames.push(item.treeName);
          }
        });
        
        let certificateUserName;
        if (order.isGift && order.giftRecipientName) {
          certificateUserName = order.giftRecipientName;
        } else {
          if (user.userType === 'company') {
            certificateUserName = user.companyName || user.name || order.userName || 'Company';
          } else {
            certificateUserName = user.name || order.userName || 'User';
          }
        }
        
        const profilePicUrl = user.image || undefined;
        
        certificateBuffer = await generateCertificate({
          userName: certificateUserName,
          profilePicUrl: profilePicUrl,
          treesCount,
          oxygenKgs,
          co2Kgs,
          treeNames: treeNames.length > 0 ? treeNames : undefined,
          publicId: user.publicId,
          orderId: order.orderId,
          qrCode: user.qrCode,
        });
        console.log(`   ✅ Certificate generated (${certificateBuffer.length} bytes)`);
      }
      
      if (!certificateBuffer || certificateBuffer.length === 0) {
        console.error(`   ❌ No certificate available`);
        continue;
      }
      
      // Send email
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      console.log(`   📤 Sending email to ${recipientEmail}...`);
      
      const emailSent = await sendThankYouEmailWithCertificate(
        recipientEmail,
        recipientName,
        order.orderId,
        treesCount,
        certificateBuffer
      );
      
      if (emailSent) {
        console.log(`   ✅ Email sent successfully!\n`);
        logPaymentEvent('thank_you_email_retry_success', {
          orderId: order.orderId,
          recipientEmail
        });
      } else {
        console.error(`   ❌ Email sending failed\n`);
        logError('Thank you email retry failed', new Error('Email sending returned false'), {
          orderId: order.orderId,
          recipientEmail
        });
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      logError('Error retrying email', error, {
        orderId: order.orderId
      });
    }
  }
  
  await mongoose.disconnect();
  console.log('✅ Done!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

