/**
 * API-related type definitions
 */

// Common API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Tree Types
export interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  imagePublicId: string;
  smallImageUrls?: string[];
  smallImagePublicIds?: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TreeCreateInput {
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  image: File;
}

export interface TreeUpdateInput {
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
}

// User Types
export interface User {
  _id: string;
  email: string;
  name?: string;
  companyName?: string;
  phone?: string;
  userType: 'individual' | 'company';
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegisterInput {
  userType: 'individual' | 'company';
  name?: string;
  companyName?: string;
  email: string;
  phone?: string;
  password: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

// Auth Types
export interface AuthSession {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: 'user' | 'admin';
    userType?: 'individual' | 'company';
  };
}

// Rate Limiting Types
export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

