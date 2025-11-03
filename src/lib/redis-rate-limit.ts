import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Redis client configuration - only create if Redis is configured
const redis = process.env.REDIS_HOST || process.env.REDIS_PORT 
  ? new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      // Production optimizations
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Error handling
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    })
  : null;

// Handle Redis connection errors gracefully
if (redis) {
  redis.on('error', (_error) => {
    // Redis connection error - fallback to memory
  });

  redis.on('connect', () => {
    // Redis connected successfully
  });

  redis.on('ready', () => {
    // Redis ready for operations
  });
}

// Fallback to in-memory store if Redis is not available
const fallbackStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export async function rateLimit(identifier: string, options: RateLimitOptions): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  
  // If Redis is not available, use fallback immediately
  if (!redis) {
    return getFallbackStore(identifier, options, now);
  }
  
  const key = `rate_limit:${identifier}`;
  
  try {
    // Try Redis first
    const current = await redis.get(key);
    
    if (!current) {
      // First request in window
      await redis.setex(key, Math.ceil(options.windowMs / 1000), '1');
      return { allowed: true, remaining: options.maxRequests - 1 };
    }
    
    const count = parseInt(current);
    
    if (count >= options.maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Increment counter
    await redis.incr(key);
    return { allowed: true, remaining: options.maxRequests - count - 1 };
    
  } catch (_error) {
    return getFallbackStore(identifier, options, now);
  }
}

function getFallbackStore(identifier: string, options: RateLimitOptions, now: number): { allowed: boolean; remaining: number } {
  // Fallback to in-memory store
  const record = fallbackStore.get(identifier);
  
  if (!record || record.resetTime < now) {
    fallbackStore.set(identifier, {
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

export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(ip, options);
  
  if (!allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(options.windowMs / 1000)),
            'X-RateLimit-Limit': String(options.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + options.windowMs),
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
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip,
    details,
    environment: process.env.NODE_ENV,
  };
  
  if (process.env.NODE_ENV === 'development') {
    // Development logging disabled
  }
  
  // In production, send to security monitoring service
  // Example: securityMonitoringService.log(event, { ...details, ip });
  
  // Store in Redis for analysis (optional)
  if (redis) {
    try {
      redis.lpush('security_logs', JSON.stringify(logEntry));
      redis.ltrim('security_logs', 0, 9999); // Keep last 10k entries
    } catch (_error) {
      // Failed to log security event to Redis
    }
  }
}

// Cleanup function
export async function cleanup() {
  if (redis) {
    try {
      await redis.quit();
    } catch (_error) {
      // Error closing Redis connection
    }
  }
}

// Health check for Redis
export async function checkRedisHealth(): Promise<boolean> {
  // If Redis is not configured, return false (will use fallback)
  if (!redis) {
    return false;
  }
  
  try {
    await redis.ping();
    return true;
  } catch (_error) {
    return false;
  }
}
