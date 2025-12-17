#!/usr/bin/env node

/**
 * Migration: backfill missing publicId values for existing users.
 *
 * - Finds users where publicId is null / empty / missing
 * - Generates a unique publicId (same pattern as the User model)
 * - Saves it once; the schema's `immutable: true` then keeps it fixed
 *
 * Run:
 *   NODE_ENV=production node scripts/backfill-user-public-ids.js
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

// Minimal User model for this migration (reuses existing "users" collection)
const userSchema = new mongoose.Schema(
  {
    publicId: String,
  },
  { strict: false } // allow other fields without defining full schema
);

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

function generatePublicId() {
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${random}${timestamp}`.toLowerCase();
}

async function ensureUniquePublicId() {
  let publicId = generatePublicId();
  // Make sure we don't clash with existing users (sparse unique index)
  // In practice collisions are extremely unlikely, but we defend anyway.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ publicId }).select('_id').lean();
    if (!existing) break;
    publicId = generatePublicId();
  }
  return publicId;
}

async function main() {
  try {
    await connectDB();

    const filter = {
      $or: [
        { publicId: { $exists: false } },
        { publicId: null },
        { publicId: '' },
      ],
    };

    const totalMissing = await User.countDocuments(filter);
    console.log(`[MIGRATION] Users missing publicId: ${totalMissing}`);

    const batchSize = 100;
    let processed = 0;

    // Process in batches to avoid loading all users into memory at once
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const users = await User.find(filter).limit(batchSize);
      if (users.length === 0) break;

      // eslint-disable-next-line no-restricted-syntax
      for (const user of users) {
        try {
          // Skip if somehow publicId got set between query and now
          if (user.publicId) {
            // eslint-disable-next-line no-continue
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const publicId = await ensureUniquePublicId();
          user.publicId = publicId;
          // eslint-disable-next-line no-await-in-loop
          await user.save();

          processed += 1;
          if (processed % 50 === 0) {
            console.log(`[MIGRATION] Assigned publicId for ${processed}/${totalMissing} users...`);
          }
        } catch (err) {
          console.error('[MIGRATION] Failed to assign publicId for user', user._id, err);
        }
      }
    }

    console.log(`[MIGRATION] Completed. publicId backfilled for ~${processed} users.`);
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Fatal error:', err);
    process.exit(1);
  }
}

main();


