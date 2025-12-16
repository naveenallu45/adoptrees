#!/usr/bin/env node

/**
 * Check pending orders and their well-wisher assignment status
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
    break;
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

async function checkPendingOrders() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');

    let Order;
    if (mongoose.models.Order) {
      Order = mongoose.model('Order');
    } else {
      Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    }

    // Find all orders grouped by status
    const allOrders = await Order.find({})
      .select('orderId userId userName paymentStatus status assignedWellwisher wellwisherTasks createdAt items totalAmount')
      .sort({ createdAt: -1 })
      .lean();

    console.log('='.repeat(80));
    console.log('📊 ORDER STATUS OVERVIEW');
    console.log('='.repeat(80));
    console.log();

    // Group by payment status
    const pendingPayment = allOrders.filter(o => o.paymentStatus === 'pending');
    const paid = allOrders.filter(o => o.paymentStatus === 'paid');
    const failed = allOrders.filter(o => o.paymentStatus === 'failed');
    const refunded = allOrders.filter(o => o.paymentStatus === 'refunded');

    console.log(`📋 Total Orders: ${allOrders.length}`);
    console.log(`  ✅ Paid: ${paid.length}`);
    console.log(`  ⏳ Pending Payment: ${pendingPayment.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);
    console.log(`  💰 Refunded: ${refunded.length}`);
    console.log();

    // Check pending payment orders
    if (pendingPayment.length > 0) {
      console.log('='.repeat(80));
      console.log('⏳ PENDING PAYMENT ORDERS');
      console.log('='.repeat(80));
      console.log();
      
      pendingPayment.forEach((order, index) => {
        const hasAssigned = !!order.assignedWellwisher;
        const hasTasks = !!(order.wellwisherTasks && order.wellwisherTasks.length > 0);
        console.log(`${index + 1}. Order ID: ${order.orderId}`);
        console.log(`   User: ${order.userName} (${order.userId})`);
        console.log(`   Amount: ₹${order.totalAmount}`);
        console.log(`   Created: ${new Date(order.createdAt).toISOString()}`);
        console.log(`   Well-wisher Assigned: ${hasAssigned ? 'Yes' : 'No'}`);
        console.log(`   Tasks Created: ${hasTasks ? 'Yes' : 'No'}`);
        console.log(`   Status: ${order.status}`);
        console.log();
      });
    }

    // Check paid orders without assignment
    const paidWithoutAssignment = paid.filter(o => !o.assignedWellwisher || !o.wellwisherTasks || o.wellwisherTasks.length === 0);
    if (paidWithoutAssignment.length > 0) {
      console.log('='.repeat(80));
      console.log('⚠️  PAID ORDERS WITHOUT WELL-WISHER ASSIGNMENT');
      console.log('='.repeat(80));
      console.log();
      
      paidWithoutAssignment.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.orderId}`);
        console.log(`   User: ${order.userName}`);
        console.log(`   Created: ${new Date(order.createdAt).toISOString()}`);
        console.log(`   Well-wisher Assigned: ${!!order.assignedWellwisher ? 'Yes' : 'No'}`);
        console.log(`   Tasks: ${order.wellwisherTasks?.length || 0}`);
        console.log();
      });
    }

    // Summary of well-wisher assignments
    const assignedOrders = allOrders.filter(o => o.assignedWellwisher);
    console.log('='.repeat(80));
    console.log('👥 WELL-WISHER ASSIGNMENT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total orders with assigned well-wisher: ${assignedOrders.length}`);
    console.log(`Paid orders with assignment: ${paid.filter(o => o.assignedWellwisher).length} / ${paid.length}`);
    console.log(`Pending orders with assignment: ${pendingPayment.filter(o => o.assignedWellwisher).length} / ${pendingPayment.length}`);
    console.log();

  } catch (error) {
    console.error('❌ Error checking pending orders:', error);
    throw error;
  }
}

async function main() {
  try {
    await checkPendingOrders();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();

