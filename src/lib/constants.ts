/**
 * Application-wide constants
 * Centralized configuration values for easy maintenance
 */

// Rate Limiting Configuration
export const RATE_LIMITS = {
  REGISTRATION: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  LOGIN: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  CLOUDINARY_FOLDER: 'adoptrees/trees',
} as const;

// Session Configuration
export const SESSION = {
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  STRATEGY: 'jwt' as const,
} as const;

// Password Configuration
export const PASSWORD = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  BCRYPT_ROUNDS: 12,
} as const;

// Validation Limits
export const VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  COMPANY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  TREE_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  TREE_INFO: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },
  PRICE: {
    MAX: 1000000,
  },
  OXYGEN: {
    MAX: 10000,
  },
} as const;

// API Response Messages
export const MESSAGES = {
  ERROR: {
    GENERIC: 'An error occurred. Please try again later.',
    UNAUTHORIZED: 'Unauthorized - Please sign in',
    FORBIDDEN: 'Forbidden - Admin access required',
    NOT_FOUND: 'Resource not found',
    VALIDATION_FAILED: 'Validation failed',
    RATE_LIMIT: 'Too many requests. Please try again later.',
  },
  SUCCESS: {
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
  },
} as const;

// User Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

// User Types
export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  INDIVIDUALS: '/individuals',
  COMPANIES: '/companies',
  ABOUT: '/about',
} as const;

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/signin',
    REGISTER: '/api/auth/register',
  },
  ADMIN: {
    TREES: '/api/admin/trees',
  },
  TREES: '/api/trees',
} as const;

