import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export interface AuthSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role: 'user' | 'admin';
    userType: 'individual' | 'company';
  };
}

/**
 * Get the authenticated session from the request
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }
  
  return session as AuthSession;
}

/**
 * Verify if the user is an admin
 */
export async function requireAdmin(): Promise<{ authorized: true; session: AuthSession } | { authorized: false; response: NextResponse }> {
  const session = await getAuthSession();
  
  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }
  
  if (session.user.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }
  
  return { authorized: true, session };
}

/**
 * Verify if the user is authenticated
 */
export async function requireAuth(): Promise<{ authorized: true; session: AuthSession } | { authorized: false; response: NextResponse }> {
  const session = await getAuthSession();
  
  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    };
  }
  
  return { authorized: true, session };
}

/**
 * Rate limiting store (in-memory, consider Redis for production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Simple rate limiting
 */
export function rateLimit(identifier: string, options: RateLimitOptions): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return { allowed: true, remaining: options.maxRequests - 1 };
  }
  
  if (record.count >= options.maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: options.maxRequests - record.count };
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(ip, options);
  
  if (!allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(options.windowMs / 1000)),
          },
        }
      ),
    };
  }
  
  return { allowed: true };
}

