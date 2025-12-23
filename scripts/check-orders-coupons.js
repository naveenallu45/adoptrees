/**
 * Script to check existing orders with FIRSTADOPT coupon
 * This helps us understand the data structure
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

async function checkOrders() {
  try {
    await connectDB();

    // First, check total orders
    const totalOrders = await Order.countDocuments({});
    console.log(`\n📊 Total orders in database: ${totalOrders}\n`);

    // Find all orders with any coupon code
    const ordersWithCoupon = await Order.find({
      couponCode: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📊 Orders with couponCode field: ${ordersWithCoupon.length}\n`);

    // Find all orders (limit to 20 for inspection)
    const allOrders = await Order.find({}).limit(20).lean();
    console.log(`📊 Sample orders (first 20):\n`);
    
    allOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  - Order ID: ${order.orderId || order._id}`);
      console.log(`  - Total Amount: ₹${order.totalAmount || 'N/A'}`);
      console.log(`  - Has couponCode: ${order.couponCode ? `Yes (${order.couponCode})` : 'No'}`);
      console.log(`  - Has couponDiscount: ${order.couponDiscount !== undefined ? `Yes (₹${order.couponDiscount})` : 'No'}`);
      console.log(`  - Has finalAmount: ${order.finalAmount !== undefined ? `Yes (₹${order.finalAmount})` : 'No'}`);
      console.log(`  - Payment Status: ${order.paymentStatus || 'N/A'}`);
      console.log('');
    });

    const orders = ordersWithCoupon;

    if (orders.length === 0) {
      console.log('No orders found with FIRSTADOPT coupon');
      await mongoose.disconnect();
      return;
    }

    // Check each order
    orders.forEach((order, index) => {
      console.log(`\n--- Order ${index + 1} ---`);
      console.log(`Order ID: ${order.orderId || order._id}`);
      console.log(`Total Amount: ₹${order.totalAmount || 'N/A'}`);
      console.log(`Coupon Code: ${order.couponCode || 'N/A'}`);
      console.log(`Coupon Discount: ₹${order.couponDiscount || 'N/A'}`);
      console.log(`Final Amount: ${order.finalAmount !== undefined ? `₹${order.finalAmount}` : 'NOT SET'}`);
      
      if (order.couponDiscount && order.totalAmount) {
        const calculatedFinal = order.totalAmount - order.couponDiscount;
        console.log(`Calculated Final: ₹${calculatedFinal.toFixed(2)}`);
      }
      
      console.log(`Payment Status: ${order.paymentStatus || 'N/A'}`);
      console.log(`Status: ${order.status || 'N/A'}`);
    });

    // Summary
    const ordersWithoutFinalAmount = orders.filter(o => 
      o.finalAmount === undefined || o.finalAmount === null
    );
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Orders without finalAmount: ${ordersWithoutFinalAmount.length}`);
    console.log(`   Orders with finalAmount: ${orders.length - ordersWithoutFinalAmount.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

