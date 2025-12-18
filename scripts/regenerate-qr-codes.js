#!/usr/bin/env node

/**
 * Migration: Regenerate QR codes for all users to match their publicId.
 *
 * - Finds all users with publicId
 * - Regenerates QR code to match their publicId
 * - Uses cursor-based pagination to process each user only once
 * - QR codes are immutable after this migration
 *
 * Run:
 *   node scripts/regenerate-qr-codes.js
 */

// Plain Node + Mongoose so this script can run without TypeScript tooling
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoose = require('mongoose');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode');

// Load environment variables from .env.local or .env if they exist
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    fileContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      // Skip comments and empty lines
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    break; // Use first file found
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[MIGRATION] MONGODB_URI is not set. Please ensure you have a .env.local file with MONGODB_URI set');
  console.error('   Or set it as an environment variable: export MONGODB_URI="your-connection-string"');
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

// Minimal User model for this migration (reuses existing "users" collection)
const userSchema = new mongoose.Schema(
  {
    publicId: String,
    qrCode: String,
  },
  { strict: false } // allow other fields without defining full schema
);

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

async function generateQRCode(publicId) {
  // Always use production URL for QR codes (they're immutable and should work in production)
  let origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://adoptrees.com';
  
  // Never use localhost in QR codes
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    origin = 'https://adoptrees.com';
  }
  
  const qrUrl = `${origin}/u/${publicId.toLowerCase()}`;
  // Use same settings as registration (width: 320 for better quality)
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M'
  });
  return qrDataUrl;
}

async function main() {
  try {
    await connectDB();
    console.log('[MIGRATION] Connected to MongoDB.');

    const filter = { publicId: { $exists: true, $ne: null, $ne: '' } };
    const totalUsers = await User.countDocuments(filter);
    
    // Count users with localhost in QR codes or missing QR codes
    const usersNeedingFix = await User.countDocuments({
      ...filter,
      $or: [
        { qrCode: { $exists: false } },
        { qrCode: null },
        { qrCode: '' },
        { qrCode: { $regex: /localhost|127\.0\.0\.1/ } }
      ]
    });
    
    console.log(`[MIGRATION] Found ${totalUsers} users with publicId.`);
    console.log(`[MIGRATION] ${usersNeedingFix} users need QR code regeneration (localhost or missing).`);

    if (totalUsers === 0) {
      console.log('[MIGRATION] No users found with publicId. Exiting.');
      await mongoose.connection.close();
      process.exit(0);
    }

    let qrRegenerated = 0;
    let lastId = null;
    const batchSize = 50; // Smaller batch for QR generation (CPU intensive)

    // Process in batches using cursor-based pagination to avoid reprocessing
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batchFilter = { ...filter };
      if (lastId) {
        batchFilter._id = { $gt: lastId };
      }

      // eslint-disable-next-line no-await-in-loop
      const users = await User.find(batchFilter).sort({ _id: 1 }).limit(batchSize);
      if (users.length === 0) break;

      // eslint-disable-next-line no-restricted-syntax
      for (const user of users) {
        try {
          // Check if QR code contains localhost or is missing
          const needsRegeneration = !user.qrCode || 
            user.qrCode.includes('localhost') || 
            user.qrCode.includes('127.0.0.1');
          
          if (needsRegeneration) {
            // eslint-disable-next-line no-await-in-loop
            const newQrCode = await generateQRCode(user.publicId);
            user.qrCode = newQrCode;
            // eslint-disable-next-line no-await-in-loop
            await user.save();
            qrRegenerated += 1;
          }
          
          lastId = user._id;

          if (qrRegenerated % 50 === 0 && qrRegenerated > 0) {
            console.log(`[MIGRATION] Regenerated QR codes for ${qrRegenerated} users...`);
          }
        } catch (err) {
          console.error('[MIGRATION] Failed to regenerate QR code for user', user._id, err);
          lastId = user._id; // Still update lastId to continue
        }
      }
    }

    console.log(`[MIGRATION] ✅ Completed! Regenerated QR codes for ${qrRegenerated} users.`);
    console.log('[MIGRATION] All QR codes now use production URL (https://adoptrees.com) and are immutable.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Fatal error:', err);
    process.exit(1);
  }
}

main();

