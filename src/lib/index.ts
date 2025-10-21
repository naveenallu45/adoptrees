/**
 * Central export file for lib utilities
 * Import from '@/lib' instead of '@/lib/specific-file'
 */

// Database
export { default as connectDB } from './mongodb';

// Cloudinary
export { default as cloudinary } from './cloudinary';
export { uploadToCloudinary, deleteFromCloudinary } from './upload';

// Environment
export { env } from './env';

// API Authentication & Authorization
export {
  getAuthSession,
  requireAdmin,
  requireAuth,
  rateLimit,
  checkRateLimit,
  getClientIp,
} from './api-auth';

// Validation Schemas
export { 
  emailSchema, 
  passwordSchema, 
  phoneSchema,
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from './validations/auth';

export {
  treeSchema,
  treeUpdateSchema,
  validateImageFile,
  MAX_FILE_SIZE,
  ACCEPTED_IMAGE_TYPES,
  type TreeInput,
  type TreeUpdateInput,
} from './validations/tree';

// Constants
export * from './constants';

