import { z } from 'zod';

const envSchema = z.object({
  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').optional(),
  
  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  
  // Redis
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // Skip validation during build time if variables are not set
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return {
      MONGODB_URI: process.env.MONGODB_URI || '',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      SENTRY_DSN: process.env.SENTRY_DSN,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    };
  }

  try {
    return envSchema.parse({
      MONGODB_URI: process.env.MONGODB_URI,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      SENTRY_DSN: process.env.SENTRY_DSN,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      const missingVars = _error.issues.map((err) => `${String(err.path.join('.'))}: ${err.message}`);
      throw new Error(
        `\n❌ Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file.\n`
      );
      
      // Only throw in runtime, not during build
      if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
        throw new Error(
          `Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file.`
        );
      }
    }
    throw _error;
  }
}

// Validate on module load
export const env = validateEnv();

