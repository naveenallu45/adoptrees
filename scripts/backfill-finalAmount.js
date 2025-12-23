/**
 * Migration script to backfill finalAmount for existing orders with coupons
 * 
 * This script:
 * 1. Finds all orders that have couponCode and couponDiscount but no finalAmount
 * 2. Calculates finalAmount = totalAmount - couponDiscount
 * 3. Updates those orders with the calculated finalAmount
 * 
 * Run with: node scripts/backfill-finalAmount.js
 */

const mongoose = require('mongoose');

// Try loading from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env' });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

async function backfillFinalAmount() {
  try {
    await connectDB();

    // Find orders with couponCode and couponDiscount but no finalAmount
    const ordersToUpdate = await Order.find({
      couponCode: { $exists: true, $ne: null },
      couponDiscount: { $exists: true, $gt: 0 },
      $or: [
        { finalAmount: { $exists: false } },
        { finalAmount: null }
      ]
    });

    console.log(`\n📊 Found ${ordersToUpdate.length} orders to update\n`);

    if (ordersToUpdate.length === 0) {
      console.log('✅ No orders need updating. All orders with coupons already have finalAmount.');
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const order of ordersToUpdate) {
      try {
        const calculatedFinalAmount = order.totalAmount - order.couponDiscount;
        
        // Round to 2 decimal places to avoid floating point issues
        const finalAmount = Math.round(calculatedFinalAmount * 100) / 100;

        await Order.updateOne(
          { _id: order._id },
          { $set: { finalAmount } }
        );

        updated++;
        console.log(`✅ Updated order ${order.orderId || order._id}: ${order.totalAmount} - ${order.couponDiscount} = ${finalAmount}`);
      } catch (error) {
        errors++;
        console.error(`❌ Error updating order ${order.orderId || order._id}:`, error.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${ordersToUpdate.length}\n`);

    // Verify the update
    const remainingOrders = await Order.countDocuments({
      couponCode: { $exists: true, $ne: null },
      couponDiscount: { $exists: true, $gt: 0 },
      $or: [
        { finalAmount: { $exists: false } },
        { finalAmount: null }
      ]
    });

    if (remainingOrders === 0) {
      console.log('✅ All orders with coupons now have finalAmount!');
    } else {
      console.log(`⚠️  ${remainingOrders} orders still need updating. You may need to run this script again.`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error in backfillFinalAmount:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
backfillFinalAmount()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

