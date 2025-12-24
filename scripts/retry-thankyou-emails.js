/**
 * Script to retry sending thank you emails with certificates for orders
 * that have certificates but may not have received emails
 * 
 * Usage: node scripts/retry-thankyou-emails.js [orderId1] [orderId2] ...
 * If no order IDs provided, will find recent orders with certificates that need emails
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Order = require('../src/models/Order').default;
const User = require('../src/models/User').default;
const { sendThankYouEmailWithCertificate } = require('../src/lib/email');
const { generateCertificate } = require('../src/lib/certificate');
const { logPaymentEvent, logError } = require('../src/lib/logger');

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

async function getCertificateBuffer(order) {
  // Try to get certificate from URL first (Cloudinary)
  if (order.certificateUrl) {
    try {
      const response = await fetch(order.certificateUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (error) {
      console.warn(`Failed to fetch certificate from URL for order ${order.orderId}:`, error.message);
    }
  }
  
  // Fallback to certificate buffer in database
  if (order.certificate) {
    return order.certificate;
  }
  
  // If no certificate exists, generate a new one
  console.log(`Generating new certificate for order ${order.orderId}...`);
  const user = await User.findById(order.userId).select('publicId qrCode image name companyName userType');
  
  if (!user || !user.publicId) {
    throw new Error(`User not found or missing publicId for order ${order.orderId}`);
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
  
  return await generateCertificate({
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
}

async function retryEmailForOrder(order) {
  try {
    console.log(`\n📧 Processing order: ${order.orderId}`);
    console.log(`   User: ${order.userName} (${order.userEmail})`);
    console.log(`   Status: ${order.status}, Payment: ${order.paymentStatus}`);
    console.log(`   Has Certificate: ${!!(order.certificate || order.certificateUrl)}`);
    
    // Determine recipient email and name
    const recipientEmail = order.isGift && order.giftRecipientEmail 
      ? order.giftRecipientEmail 
      : order.userEmail;
    const recipientName = order.isGift && order.giftRecipientName 
      ? order.giftRecipientName 
      : order.userName;
    
    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.error(`   ❌ Invalid email address: ${recipientEmail}`);
      return { success: false, error: 'Invalid email address' };
    }
    
    // Get certificate buffer
    const certificateBuffer = await getCertificateBuffer(order);
    
    if (!certificateBuffer || certificateBuffer.length === 0) {
      console.error(`   ❌ No certificate available for order ${order.orderId}`);
      return { success: false, error: 'No certificate available' };
    }
    
    console.log(`   📄 Certificate size: ${certificateBuffer.length} bytes`);
    
    // Calculate trees count
    const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Send email
    console.log(`   📤 Sending email to: ${recipientEmail}...`);
    const emailSent = await sendThankYouEmailWithCertificate(
      recipientEmail,
      recipientName,
      order.orderId,
      treesCount,
      certificateBuffer
    );
    
    if (emailSent) {
      console.log(`   ✅ Email sent successfully!`);
      logPaymentEvent('thank_you_email_retry_success', {
        orderId: order.orderId,
        recipientEmail
      });
      return { success: true, emailSent: true };
    } else {
      console.error(`   ❌ Email sending failed`);
      logError('Thank you email retry failed', new Error('Email sending returned false'), {
        orderId: order.orderId,
        recipientEmail
      });
      return { success: false, error: 'Email sending returned false' };
    }
  } catch (error) {
    console.error(`   ❌ Error processing order ${order.orderId}:`, error.message);
    logError('Error retrying thank you email', error, {
      orderId: order.orderId
    });
    return { success: false, error: error.message };
  }
}

async function findOrdersNeedingEmails(limit = 10) {
  // Find recent paid orders with certificates that were created in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const orders = await Order.find({
    paymentStatus: 'paid',
    status: { $in: ['confirmed', 'planted', 'completed'] },
    $or: [
      { certificateUrl: { $exists: true, $ne: null } },
      { certificate: { $exists: true } }
    ],
    createdAt: { $gte: sevenDaysAgo }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl status paymentStatus createdAt')
    .lean();
  
  return orders;
}

async function main() {
  await connectDB();
  
  const orderIds = process.argv.slice(2);
  
  let orders = [];
  
  if (orderIds.length > 0) {
    // Find specific orders by ID
    console.log(`🔍 Finding orders: ${orderIds.join(', ')}`);
    orders = await Order.find({
      orderId: { $in: orderIds }
    })
      .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl certificate status paymentStatus createdAt')
      .lean();
    
    if (orders.length === 0) {
      console.error('❌ No orders found with the provided IDs');
      process.exit(1);
    }
  } else {
    // Find recent orders that might need emails
    console.log('🔍 Finding recent orders with certificates...');
    orders = await findOrdersNeedingEmails(20);
    
    if (orders.length === 0) {
      console.log('✅ No orders found that need email retry');
      process.exit(0);
    }
    
    console.log(`📋 Found ${orders.length} orders to process`);
    console.log('   (To retry specific orders, provide order IDs as arguments)');
  }
  
  console.log(`\n🚀 Starting email retry for ${orders.length} order(s)...\n`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const order of orders) {
    const result = await retryEmailForOrder(order);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        orderId: order.orderId,
        error: result.error
      });
    }
    
    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
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

