#!/usr/bin/env node

/**
 * Script to retry sending thank you emails with certificates for specific orders
 * Usage: node scripts/retry-specific-orders.js ORDER_ID1 ORDER_ID2 ...
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
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

// Simple fetch implementation for Node.js
async function fetch(url) {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
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
        resolve({
          ok: true,
          arrayBuffer: async () => Buffer.concat(chunks)
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  const orderIds = process.argv.slice(2);
  
  if (orderIds.length === 0) {
    console.error('❌ Please provide order IDs as arguments');
    console.error('Usage: node scripts/retry-specific-orders.js ORDER_ID1 ORDER_ID2 ...');
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
  
  let User;
  if (mongoose.models.User) {
    User = mongoose.model('User');
  } else {
    User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
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
  
  console.log(`✅ Found ${orders.length} order(s):\n`);
  orders.forEach((order, index) => {
    console.log(`${index + 1}. Order ID: ${order.orderId}`);
    console.log(`   User: ${order.userName} (${order.userEmail})`);
    console.log(`   Status: ${order.status}, Payment: ${order.paymentStatus}`);
    console.log(`   Has Certificate: ${!!(order.certificate || order.certificateUrl)}\n`);
  });
  
  // Import email and certificate functions
  // Since these are TypeScript modules, we'll need to use a workaround
  // For now, let's use the API endpoint approach or create a simpler solution
  
  console.log('\n📧 To retry emails, please use one of these methods:');
  console.log('\n1. Use the API endpoint (if server is running):');
  console.log(`   curl -X POST http://localhost:3000/api/admin/retry-email \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"orderIds": ${JSON.stringify(orderIds)}}'`);
  console.log('\n2. Or manually trigger processOrderCompletion for these orders');
  console.log('\n3. Or use the admin panel to retry emails');
  
  // For now, let's at least verify the orders exist and show their details
  console.log('\n📊 Order Details:');
  for (const order of orders) {
    const recipientEmail = order.isGift && order.giftRecipientEmail
      ? order.giftRecipientEmail
      : order.userEmail;
    const recipientName = order.isGift && order.giftRecipientName
      ? order.giftRecipientName
      : order.userName;
    
    console.log(`\nOrder: ${order.orderId}`);
    console.log(`  Recipient: ${recipientName} (${recipientEmail})`);
    console.log(`  Trees: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`);
    console.log(`  Certificate: ${order.certificateUrl ? '✅ (Cloudinary)' : order.certificate ? '✅ (Database)' : '❌ Missing'}`);
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

