/**
 * Migration script to backfill credits for existing orders
 * 
 * This script:
 * 1. Finds all paid/completed orders that don't have creditsEarned
 * 2. Calculates 10% credits based on tree price (not discounted) for individual/company adoptions (not forest)
 * 3. Awards credits to users
 * 4. Updates orders with creditsEarned field
 * 
 * Run with: node scripts/backfill-credits.js
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

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function backfillCredits() {
  try {
    await connectDB();

    // Find all paid/completed orders that don't have creditsEarned
    const ordersToProcess = await Order.find({
      paymentStatus: 'paid',
      status: { $in: ['confirmed', 'planted', 'completed'] },
      $or: [
        { creditsEarned: { $exists: false } },
        { creditsEarned: null },
        { creditsEarned: 0 }
      ]
    }).sort({ createdAt: 1 }); // Process oldest first

    console.log(`\n📊 Found ${ordersToProcess.length} orders to process\n`);

    if (ordersToProcess.length === 0) {
      console.log('✅ No orders need processing. All paid orders already have credits.');
      await mongoose.disconnect();
      return;
    }

    let processed = 0;
    let creditsAwarded = 0;
    let errors = 0;
    const userCreditsMap = new Map(); // Track credits per user to batch update

    for (const order of ordersToProcess) {
      try {
        // Calculate credits based on tree price (not discounted) for individual/company adoptions (not forest)
        let creditsToAward = 0;
        
        order.items.forEach((item) => {
          const treeType = item.treeType || 'individual';
          // Only award credits for individual and company adoptions, not forest
          if (treeType === 'individual' || treeType === 'company') {
            // 10% of tree price (not discounted) per item
            creditsToAward += Math.round((item.price * item.quantity) * 0.1);
          }
        });

        if (creditsToAward > 0) {
          // Track credits per user for batch update
          const userId = String(order.userId);
          const currentCredits = userCreditsMap.get(userId) || 0;
          userCreditsMap.set(userId, currentCredits + creditsToAward);

          // Update order with creditsEarned
          await Order.updateOne(
            { _id: order._id },
            { $set: { creditsEarned: creditsToAward } }
          );

          creditsAwarded += creditsToAward;
          processed++;
          console.log(`✅ Order ${order.orderId}: Awarded ₹${creditsToAward} credits (${order.items.length} items)`);
        } else {
          // Mark as processed even if no credits (forest orders)
          await Order.updateOne(
            { _id: order._id },
            { $set: { creditsEarned: 0 } }
          );
          processed++;
          console.log(`ℹ️  Order ${order.orderId}: No credits (forest or empty order)`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing order ${order.orderId || order._id}:`, error.message);
      }
    }

    // Batch update user credits
    console.log(`\n💰 Updating user credits...\n`);
    let usersUpdated = 0;
    let userErrors = 0;

    for (const [userId, creditsToAdd] of userCreditsMap.entries()) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.error(`⚠️  User ${userId} not found, skipping credits`);
          continue;
        }

        const currentCredits = user.credits || 0;
        const newCredits = currentCredits + creditsToAdd;

        await User.updateOne(
          { _id: userId },
          { $set: { credits: newCredits } }
        );

        usersUpdated++;
        console.log(`✅ User ${user.email || userId}: Added ₹${creditsToAdd} credits (Total: ₹${newCredits})`);
      } catch (error) {
        userErrors++;
        console.error(`❌ Error updating user ${userId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Orders processed: ${processed}`);
    console.log(`   💰 Total credits awarded: ₹${creditsAwarded.toLocaleString()}`);
    console.log(`   👥 Users updated: ${usersUpdated}`);
    console.log(`   ❌ Order errors: ${errors}`);
    console.log(`   ❌ User errors: ${userErrors}`);
    console.log(`   📊 Total orders found: ${ordersToProcess.length}\n`);

    // Verify the update
    const remainingOrders = await Order.countDocuments({
      paymentStatus: 'paid',
      status: { $in: ['confirmed', 'planted', 'completed'] },
      $or: [
        { creditsEarned: { $exists: false } },
        { creditsEarned: null },
        { creditsEarned: 0 }
      ]
    });

    if (remainingOrders === 0) {
      console.log('✅ All paid orders now have credits processed!');
    } else {
      console.log(`⚠️  ${remainingOrders} orders still need processing. You may need to run this script again.`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error in backfillCredits:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
backfillCredits()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

