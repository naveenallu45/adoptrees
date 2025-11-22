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
    const opts = {
      bufferCommands: false,
      // Production optimizations
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds for better reliability
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      // Connection options
      connectTimeoutMS: 15000, // Increased to 15 seconds
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
