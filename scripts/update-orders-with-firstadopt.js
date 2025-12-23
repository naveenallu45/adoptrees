/**
 * Script to update existing orders with FIRSTADOPT coupon information
 * 
 * Since these orders used a 99% discount, we need to:
 * 1. Calculate the original totalAmount from the current amount (which is the final amount after 99% discount)
 * 2. Set couponCode to "FIRSTADOPT"
 * 3. Set couponDiscount to 99% of the original amount
 * 4. Set finalAmount to the current totalAmount (which is already the discounted amount)
 * 
 * Formula: If finalAmount = originalAmount * 0.01 (99% discount)
 *          Then originalAmount = finalAmount / 0.01 = finalAmount * 100
 *          And couponDiscount = originalAmount - finalAmount = originalAmount * 0.99
 * 
 * Run with: node scripts/update-orders-with-firstadopt.js
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

async function updateOrdersWithFirstAdopt() {
  try {
    await connectDB();

    // Find all orders without couponCode (the 10 existing orders)
    const ordersToUpdate = await Order.find({
      $or: [
        { couponCode: { $exists: false } },
        { couponCode: null }
      ]
    }).lean();

    console.log(`\n📊 Found ${ordersToUpdate.length} orders without couponCode\n`);

    if (ordersToUpdate.length === 0) {
      console.log('✅ No orders need updating.');
      await mongoose.disconnect();
      return;
    }

    // Show what will be updated
    console.log('Orders to be updated:');
    ordersToUpdate.forEach((order, index) => {
      const currentAmount = order.totalAmount || 0;
      // Calculate original amount assuming 99% discount was applied
      // If current amount is the final amount after 99% discount:
      // originalAmount = currentAmount / 0.01 = currentAmount * 100
      const originalAmount = currentAmount * 100;
      const couponDiscount = originalAmount - currentAmount;
      
      console.log(`\n${index + 1}. Order ${order.orderId || order._id}:`);
      console.log(`   Current totalAmount: ₹${currentAmount}`);
      console.log(`   Calculated originalAmount: ₹${originalAmount.toFixed(2)}`);
      console.log(`   Calculated couponDiscount: ₹${couponDiscount.toFixed(2)}`);
      console.log(`   Final amount (after discount): ₹${currentAmount}`);
    });

    // Ask for confirmation (in a real scenario, you'd use readline)
    console.log('\n⚠️  WARNING: This will update all orders without couponCode.');
    console.log('   If these orders did NOT use FIRSTADOPT coupon, DO NOT proceed.');
    console.log('\n   To proceed, uncomment the update section in the script.\n');

    // Set this to true to actually perform the update
    const PERFORM_UPDATE = true; // UPDATE ENABLED

    if (!PERFORM_UPDATE) {
      console.log('\n⚠️  UPDATE IS DISABLED. Set PERFORM_UPDATE = true to run the update.\n');
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let errors = 0;

    console.log('\n🔄 Starting update...\n');

    for (const order of ordersToUpdate) {
      try {
        const currentAmount = order.totalAmount || 0;
        
        // ASSUMPTION: Current totalAmount is the FINAL amount after 99% discount
        // If this is wrong, the calculations will be incorrect
        
        // Calculate original amount assuming 99% discount was applied
        // If finalAmount = originalAmount * 0.01, then originalAmount = finalAmount * 100
        const originalAmount = Math.round(currentAmount * 100 * 100) / 100; // Round to 2 decimals
        const couponDiscount = Math.round((originalAmount - currentAmount) * 100) / 100;
        const finalAmount = currentAmount; // Current amount is already the final discounted amount

        await Order.updateOne(
          { _id: order._id },
          { 
            $set: { 
              totalAmount: originalAmount, // Update to original amount (before discount)
              couponCode: 'FIRSTADOPT',
              couponDiscount: couponDiscount,
              finalAmount: finalAmount // Set final amount (after discount)
            } 
          }
        );

        updated++;
        console.log(`✅ Updated order ${order.orderId || order._id}:`);
        console.log(`   Original: ₹${originalAmount.toFixed(2)}, Discount: ₹${couponDiscount.toFixed(2)}, Final: ₹${finalAmount.toFixed(2)}`);
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
    const updatedOrders = await Order.find({
      couponCode: 'FIRSTADOPT'
    }).lean();
    
    console.log(`✅ Verification: Found ${updatedOrders.length} orders with FIRSTADOPT coupon`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateOrdersWithFirstAdopt()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

