#!/usr/bin/env node

/**
 * Script to send thank you emails with certificates for specific orders
 * This script directly calls the order processing function to send emails
 * Usage: node scripts/send-emails-for-orders.js ORDER_ID1 ORDER_ID2 ...
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

async function main() {
  const orderIds = process.argv.slice(2);
  
  if (orderIds.length === 0) {
    console.error('❌ Please provide order IDs as arguments');
    console.error('Usage: node scripts/send-emails-for-orders.js ORDER_ID1 ORDER_ID2 ...');
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
  }).lean();
  
  if (orders.length === 0) {
    console.error('❌ No orders found with the provided IDs');
    await mongoose.disconnect();
    process.exit(1);
  }
  
  console.log(`✅ Found ${orders.length} order(s)\n`);
  
  // Import the order processing function
  // Since it's TypeScript, we need to use a workaround
  // Let's use dynamic import with .ts extension or compile first
  console.log('📧 Processing orders to send emails...\n');
  
  try {
    // Use tsx or ts-node to run TypeScript
    const { execSync } = require('child_process');
    
    // Create a temporary TypeScript file that will process these orders
    const tempScript = `
import { processOrderCompletion } from './src/lib/order-processing';
import connectDB from './src/lib/mongodb';
import Order from './src/models/Order';

async function run() {
  await connectDB();
  const orderIds = ${JSON.stringify(orderIds)};
  
  for (const orderId of orderIds) {
    const order = await Order.findOne({ orderId });
    if (order) {
      console.log(\`Processing order: \${orderId}\`);
      const result = await processOrderCompletion(order);
      console.log(\`Result: \${JSON.stringify(result, null, 2)}\`);
    }
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
`;
    
    const tempFile = path.join(__dirname, 'temp-retry-emails.ts');
    fs.writeFileSync(tempFile, tempScript);
    
    console.log('🚀 Running order processing...\n');
    
    // Try to use tsx if available, otherwise ts-node
    try {
      execSync(`npx tsx ${tempFile}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      // Fallback to ts-node
      try {
        execSync(`npx ts-node ${tempFile}`, { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
      } catch (error2) {
        console.error('❌ Could not run TypeScript. Please install tsx or ts-node:');
        console.error('   npm install -g tsx');
        console.error('   or');
        console.error('   npm install -g ts-node typescript');
        console.error('\nAlternatively, start your dev server and use the API endpoint:');
        console.error(`   curl -X POST http://localhost:3000/api/admin/retry-email \\`);
        console.error(`     -H "Content-Type: application/json" \\`);
        console.error(`     -d '{"orderIds": ${JSON.stringify(orderIds)}}'`);
        fs.unlinkSync(tempFile);
        process.exit(1);
      }
    }
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Alternative: Start your dev server and use the API endpoint');
    process.exit(1);
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

