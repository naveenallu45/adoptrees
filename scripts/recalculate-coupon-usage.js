#!/usr/bin/env node

/**
 * Migration: Recalculate coupon usage counts from existing orders
 * 
 * This script:
 * 1. Finds all paid orders that used coupons
 * 2. Counts how many times each coupon code was used
 * 3. Updates the usedCount field in the Coupon model
 * 
 * Run:
 *   NODE_ENV=production node scripts/recalculate-coupon-usage.js
 * 
 * Or with dry-run (shows what would be updated without making changes):
 *   NODE_ENV=production node scripts/recalculate-coupon-usage.js --dry-run
 */

// Plain Node + Mongoose so this script can run without TypeScript tooling
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoose = require('mongoose');

// Try loading from .env.local first, then .env (if dotenv is available)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '.env.local' });
  if (!process.env.MONGODB_URI) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config({ path: '.env' });
  }
} catch (e) {
  // dotenv not available, assume MONGODB_URI is set in environment
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[MIGRATION] MONGODB_URI is not set. Please export it before running this script.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 10,
  });
  return mongoose;
}

// Minimal schemas for this migration (reuses existing collections)
const orderSchema = new mongoose.Schema({}, { strict: false });
const couponSchema = new mongoose.Schema({}, { strict: false });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema, 'orders');
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema, 'coupons');

async function main() {
  try {
    await connectDB();
    console.log('[MIGRATION] Connected to database');

    if (isDryRun) {
      console.log('[MIGRATION] ⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Find all paid orders with coupon codes
    console.log('[MIGRATION] Finding all paid orders with coupon codes...');
    const ordersWithCoupons = await Order.find({
      couponCode: { $exists: true, $ne: null, $ne: '' },
      paymentStatus: 'paid'
    }).select('couponCode').lean();

    console.log(`[MIGRATION] Found ${ordersWithCoupons.length} paid orders with coupon codes`);

    if (ordersWithCoupons.length === 0) {
      console.log('[MIGRATION] No orders found with coupons. Nothing to update.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Step 2: Count usage for each coupon code
    console.log('[MIGRATION] Counting usage for each coupon code...');
    const usageCounts = {};

    ordersWithCoupons.forEach((order) => {
      const code = order.couponCode?.toUpperCase().trim();
      if (code) {
        usageCounts[code] = (usageCounts[code] || 0) + 1;
      }
    });

    const uniqueCoupons = Object.keys(usageCounts);
    console.log(`[MIGRATION] Found ${uniqueCoupons.length} unique coupon codes used in orders`);

    // Step 3: Display what we found
    console.log('\n[MIGRATION] Coupon usage summary:');
    console.log('─'.repeat(60));
    uniqueCoupons.forEach((code) => {
      console.log(`  ${code.padEnd(20)} : ${usageCounts[code]} usage(s)`);
    });
    console.log('─'.repeat(60));

    // Step 4: Update each coupon's usedCount
    console.log('\n[MIGRATION] Updating coupon usedCount fields...');
    let updated = 0;
    let notFound = 0;
    let unchanged = 0;

    for (const code of uniqueCoupons) {
      try {
        const coupon = await Coupon.findOne({ code: code });
        
        if (!coupon) {
          console.log(`  ⚠️  Coupon "${code}" not found in database (used ${usageCounts[code]} times in orders)`);
          notFound += 1;
          continue;
        }

        const currentCount = coupon.usedCount || 0;
        const actualCount = usageCounts[code];

        if (currentCount === actualCount) {
          console.log(`  ✓ Coupon "${code}" already has correct count: ${actualCount}`);
          unchanged += 1;
        } else {
          if (isDryRun) {
            console.log(`  🔍 [DRY RUN] Would update "${code}": ${currentCount} → ${actualCount}`);
          } else {
            await Coupon.updateOne(
              { code: code },
              { $set: { usedCount: actualCount } }
            );
            console.log(`  ✓ Updated "${code}": ${currentCount} → ${actualCount}`);
          }
          updated += 1;
        }
      } catch (err) {
        console.error(`  ❌ Error updating coupon "${code}":`, err.message);
      }
    }

    // Step 5: Summary
    console.log('\n[MIGRATION] Summary:');
    console.log('─'.repeat(60));
    console.log(`  Total unique coupons found: ${uniqueCoupons.length}`);
    console.log(`  Coupons updated: ${updated}`);
    console.log(`  Coupons unchanged (already correct): ${unchanged}`);
    console.log(`  Coupons not found in database: ${notFound}`);
    console.log('─'.repeat(60));

    if (isDryRun) {
      console.log('\n[MIGRATION] ⚠️  DRY RUN COMPLETE - No changes were made');
      console.log('[MIGRATION] Run without --dry-run to apply changes');
    } else {
      console.log('\n[MIGRATION] ✅ Migration completed successfully');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Fatal error:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();

