#!/usr/bin/env node

/**
 * Migration: Match QR codes to extract and assign missing publicIds.
 *
 * - Finds users with QR codes but missing publicIds
 * - Decodes QR code images to extract the URL
 * - Extracts publicId from URL pattern (e.g., https://adoptrees.com/u/{publicId})
 * - Assigns the extracted publicId to the user
 *
 * Run:
 *   NODE_ENV=production node scripts/match-qr-code-to-publicid.js
 */

// Plain Node + Mongoose so this script can run without TypeScript tooling
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongoose = require('mongoose');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCanvas, loadImage } = require('canvas');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = require('jsqr');

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
  console.error('[MIGRATION] MONGODB_URI is not set. Please export it before running this script.');
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
    email: String,
    name: String,
  },
  { strict: false } // allow other fields without defining full schema
);

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

/**
 * Decode QR code from base64 data URL and extract publicId from URL
 * @param {string} qrCodeDataUrl - Base64 data URL of QR code image
 * @returns {string|null} - Extracted publicId or null if not found
 */
async function extractPublicIdFromQRCode(qrCodeDataUrl) {
  try {
    if (!qrCodeDataUrl || typeof qrCodeDataUrl !== 'string') {
      return null;
    }

    // Extract base64 data from data URL (format: data:image/png;base64,...)
    let base64Data = qrCodeDataUrl;
    if (qrCodeDataUrl.includes(',')) {
      base64Data = qrCodeDataUrl.split(',')[1];
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Load image using canvas
    const img = await loadImage(imageBuffer);
    
    // Create canvas and draw image
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Get image data for jsQR
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decode QR code
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (!qrCode) {
      return null;
    }

    // Extract publicId from URL
    // Expected format: https://adoptrees.com/u/{publicId} or http://localhost:3000/u/{publicId}
    const url = qrCode.data;
    const match = url.match(/\/u\/([a-z0-9]+)/i);
    
    if (match && match[1]) {
      return match[1].toLowerCase();
    }

    return null;
  } catch (error) {
    console.error('[MIGRATION] Error decoding QR code:', error.message);
    return null;
  }
}

async function ensureUniquePublicId(proposedPublicId) {
  // Check if the proposed publicId is already taken
  const existing = await User.findOne({ publicId: proposedPublicId }).select('_id').lean();
  if (existing) {
    // If it's taken, generate a new one
    const generatePublicId = () => {
      const random = Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now().toString(36).slice(-4);
      return `${random}${timestamp}`.toLowerCase();
    };
    
    let newPublicId = generatePublicId();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const existingCheck = await User.findOne({ publicId: newPublicId }).select('_id').lean();
      if (!existingCheck) break;
      newPublicId = generatePublicId();
    }
    return newPublicId;
  }
  return proposedPublicId;
}

async function main() {
  try {
    await connectDB();
    console.log('[MIGRATION] Connected to MongoDB.');

    // Find users with QR codes but missing publicIds
    const filter = {
      $and: [
        {
          $or: [
            { publicId: { $exists: false } },
            { publicId: null },
            { publicId: '' },
          ],
        },
        {
          qrCode: { $exists: true, $ne: null, $ne: '' },
        },
      ],
    };

    const totalMissing = await User.countDocuments(filter);
    console.log(`[MIGRATION] Found ${totalMissing} users with QR codes but missing publicId.`);

    if (totalMissing === 0) {
      console.log('[MIGRATION] No users found with QR codes but missing publicId. Exiting.');
      await mongoose.connection.close();
      process.exit(0);
    }

    const batchSize = 50;
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let lastId = null;

    // Process in batches using cursor-based pagination
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
          // Skip if somehow publicId got set between query and now
          if (user.publicId) {
            // eslint-disable-next-line no-continue
            continue;
          }

          if (!user.qrCode) {
            console.log(`[MIGRATION] User ${user._id} (${user.email || 'no email'}) has no QR code, skipping.`);
            processed += 1;
            failedCount += 1;
            lastId = user._id;
            // eslint-disable-next-line no-continue
            continue;
          }

          // Extract publicId from QR code
          // eslint-disable-next-line no-await-in-loop
          const extractedPublicId = await extractPublicIdFromQRCode(user.qrCode);

          if (!extractedPublicId) {
            console.log(`[MIGRATION] Could not extract publicId from QR code for user ${user._id} (${user.email || 'no email'})`);
            processed += 1;
            failedCount += 1;
            lastId = user._id;
            // eslint-disable-next-line no-continue
            continue;
          }

          // Ensure the publicId is unique
          // eslint-disable-next-line no-await-in-loop
          const uniquePublicId = await ensureUniquePublicId(extractedPublicId);

          if (uniquePublicId !== extractedPublicId) {
            console.log(`[MIGRATION] Extracted publicId ${extractedPublicId} was already taken for user ${user._id}, generated new one: ${uniquePublicId}`);
          }

          // Assign publicId to user
          user.publicId = uniquePublicId;
          // eslint-disable-next-line no-await-in-loop
          await user.save();

          processed += 1;
          successCount += 1;
          lastId = user._id;

          if (processed % 10 === 0) {
            console.log(`[MIGRATION] Processed ${processed}/${totalMissing} users... (${successCount} successful, ${failedCount} failed)`);
          }
        } catch (err) {
          console.error(`[MIGRATION] Failed to process user ${user._id} (${user.email || 'no email'}):`, err.message);
          processed += 1;
          failedCount += 1;
          lastId = user._id;
        }
      }
    }

    console.log(`[MIGRATION] ✅ Completed!`);
    console.log(`[MIGRATION] Total processed: ${processed}`);
    console.log(`[MIGRATION] Successfully assigned publicId: ${successCount}`);
    console.log(`[MIGRATION] Failed: ${failedCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Fatal error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();

