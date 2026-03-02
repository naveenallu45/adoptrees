import mongoose from 'mongoose';
import { env } from './env';

const MONGODB_URI = env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!cached) {
    cached = globalThis.mongoose = { conn: null, promise: null };
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Reduce timeout during build time to prevent hanging
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || !process.env.MONGODB_URI;
    const opts = {
      bufferCommands: false,
      // Production optimizations
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: isBuildTime ? 5000 : 10000, // Shorter timeout during build
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      // Connection options
      connectTimeoutMS: isBuildTime ? 5000 : 15000, // Shorter timeout during build
      heartbeatFrequencyMS: 10000,
      // Retry options
      retryWrites: true,
      retryReads: true,
      // Compression
      compressors: ['zlib'] as ('zlib' | 'none' | 'snappy' | 'zstd')[],
      // DNS options - help with SRV record resolution
      directConnection: false, // Allow SRV records
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    }).catch((error) => {
      // Clear promise on error so we can retry
      if (cached) {
        cached.promise = null;
      }
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (_e) {
    cached.promise = null;
    throw _e;
  }

  return cached.conn;
}

export default connectDB;
