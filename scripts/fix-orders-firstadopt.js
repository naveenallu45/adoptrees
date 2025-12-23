/**
 * Script to FIX the orders with FIRSTADOPT coupon information
 * 
 * CORRECT CALCULATION:
 * - Original price: ₹499 or ₹599 (this is the totalAmount)
 * - 99% discount applied
 * - Final amount: ₹499 * 0.01 = ₹4.99 or ₹599 * 0.01 = ₹5.99
 * - Discount amount: ₹499 * 0.99 = ₹494.01 or ₹599 * 0.99 = ₹593.01
 * 
 * This script fixes the incorrect update that was done earlier.
 */

const mongoose = require('mongoose');

// Try loading from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env' });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
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

async function fixOrders() {
  try {
    await connectDB();

    // Find all orders with FIRSTADOPT coupon
    const orders = await Order.find({
      couponCode: 'FIRSTADOPT'
    }).lean();

    console.log(`\n📊 Found ${orders.length} orders with FIRSTADOPT coupon\n`);

    if (orders.length === 0) {
      console.log('No orders found with FIRSTADOPT coupon');
      await mongoose.disconnect();
      return;
    }

    // Show what will be fixed
    console.log('Orders to be fixed:');
    orders.forEach((order, index) => {
      // The current totalAmount is wrong (₹49,900 or ₹59,900)
      // We need to calculate what the original was
      // If current totalAmount is ₹49,900, original was ₹499
      // If current totalAmount is ₹59,900, original was ₹599
      
      let originalAmount;
      if (order.totalAmount >= 49000 && order.totalAmount < 50000) {
        originalAmount = 499;
      } else if (order.totalAmount >= 59000 && order.totalAmount < 60000) {
        originalAmount = 599;
      } else {
        // Try to reverse calculate
        originalAmount = order.totalAmount / 100;
      }
      
      const couponDiscount = Math.round(originalAmount * 0.99 * 100) / 100;
      const finalAmount = Math.round(originalAmount * 0.01 * 100) / 100;
      
      console.log(`\n${index + 1}. Order ${order.orderId || order._id}:`);
      console.log(`   Current (wrong) totalAmount: ₹${order.totalAmount}`);
      console.log(`   Correct originalAmount: ₹${originalAmount}`);
      console.log(`   Correct couponDiscount: ₹${couponDiscount}`);
      console.log(`   Correct finalAmount: ₹${finalAmount}`);
    });

    // Perform the fix
    console.log('\n🔄 Starting fix...\n');

    let updated = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        // Determine original amount based on current totalAmount
        let originalAmount;
        if (order.totalAmount >= 49000 && order.totalAmount < 50000) {
          originalAmount = 499;
        } else if (order.totalAmount >= 59000 && order.totalAmount < 60000) {
          originalAmount = 599;
        } else {
          // Fallback: reverse calculate
          originalAmount = Math.round(order.totalAmount / 100);
        }
        
        // Calculate correct values
        const couponDiscount = Math.round(originalAmount * 0.99 * 100) / 100;
        const finalAmount = Math.round(originalAmount * 0.01 * 100) / 100;

        await Order.updateOne(
          { _id: order._id },
          { 
            $set: { 
              totalAmount: originalAmount, // Original price: ₹499 or ₹599
              couponCode: 'FIRSTADOPT',
              couponDiscount: couponDiscount, // 99% of original
              finalAmount: finalAmount // 1% of original (after 99% discount)
            } 
          }
        );

        updated++;
        console.log(`✅ Fixed order ${order.orderId || order._id}:`);
        console.log(`   Original: ₹${originalAmount}, Discount: ₹${couponDiscount}, Final: ₹${finalAmount}`);
      } catch (error) {
        errors++;
        console.error(`❌ Error fixing order ${order.orderId || order._id}:`, error.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${orders.length}\n`);

    // Verify the fix
    const fixedOrders = await Order.find({
      couponCode: 'FIRSTADOPT'
    }).lean();
    
    console.log(`✅ Verification: Found ${fixedOrders.length} orders with FIRSTADOPT coupon`);
    if (fixedOrders.length > 0) {
      console.log('\nSample fixed order:');
      const sample = fixedOrders[0];
      console.log(`   Order ID: ${sample.orderId}`);
      console.log(`   Total Amount (original): ₹${sample.totalAmount}`);
      console.log(`   Coupon Discount: ₹${sample.couponDiscount}`);
      console.log(`   Final Amount (after discount): ₹${sample.finalAmount}`);
      console.log(`   Verification: ${sample.totalAmount} - ${sample.couponDiscount} = ${(sample.totalAmount - sample.couponDiscount).toFixed(2)}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixOrders()
  .then(() => {
    console.log('✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });

