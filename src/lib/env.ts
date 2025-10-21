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
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${String(err.path.join('.'))}: ${err.message}`);
      console.error(
        `\n❌ Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file.\n`
      );
      
      // Only throw in runtime, not during build
      if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
        throw new Error(
          `Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file.`
        );
      }
    }
    throw error;
  }
}

// Validate on module load
export const env = validateEnv();

