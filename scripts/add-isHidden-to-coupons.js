#!/usr/bin/env node

/**
 * Migration: Add isHidden field to existing coupons.
 *
 * - Finds coupons where isHidden field is missing
 * - Sets isHidden: false for all existing coupons (default value)
 *
 * Run:
 *   NODE_ENV=production node scripts/add-isHidden-to-coupons.js
 *   or
 *   node scripts/add-isHidden-to-coupons.js
 */

// Plain Node + Mongoose so this script can run without TypeScript tooling
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[MIGRATION] MONGODB_URI is not set. Please export it before running this script.');
  process.exit(1);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 10,
  });
  return mongoose;
}

// Minimal Coupon model for this migration (reuses existing "coupons" collection)
const couponSchema = new mongoose.Schema(
  {
    code: String,
    isHidden: {
      type: Boolean,
      default: false
    }
  },
  { strict: false } // allow other fields without defining full schema
);

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema, 'coupons');

async function main() {
  try {
    await connectDB();
    console.log('[MIGRATION] Connected to database');

    // Find coupons where isHidden field is missing or null
    const filter = {
      $or: [
        { isHidden: { $exists: false } },
        { isHidden: null }
      ]
    };

    const totalMissing = await Coupon.countDocuments(filter);
    console.log(`[MIGRATION] Coupons missing isHidden field: ${totalMissing}`);

    if (totalMissing === 0) {
      console.log('[MIGRATION] No coupons need updating. All coupons already have isHidden field.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Use updateMany for efficiency - bulk update all at once
    const result = await Coupon.updateMany(
      filter,
      { $set: { isHidden: false } }
    );

    console.log(`[MIGRATION] Updated ${result.modifiedCount} coupons with isHidden: false`);
    console.log(`[MIGRATION] Matched ${result.matchedCount} coupons`);
    
    // Verify the update
    const remainingMissing = await Coupon.countDocuments(filter);
    if (remainingMissing === 0) {
      console.log('[MIGRATION] ✓ Successfully added isHidden field to all coupons');
    } else {
      console.warn(`[MIGRATION] ⚠ Warning: ${remainingMissing} coupons still missing isHidden field`);
    }

    await mongoose.disconnect();
    console.log('[MIGRATION] Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Fatal error:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();

