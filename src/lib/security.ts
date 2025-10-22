import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

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

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function validateObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function logSecurityEvent(event: string, details: Record<string, unknown>, ip: string) {
  console.log(`[SECURITY] ${event} - IP: ${ip} - Details:`, JSON.stringify(details));
  // In production, send to security monitoring service
}
