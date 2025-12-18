import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimit, clearAllRateLimits, getClientIp } from '@/lib/redis-rate-limit';

/**
 * Development-only endpoint to clear rate limits
 * This endpoint is only available in development mode
 */
export async function POST(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { ip, clearAll } = body;

    if (clearAll) {
      // Clear all rate limits
      const cleared = await clearAllRateLimits();
      return NextResponse.json({
        success: true,
        message: `Cleared ${cleared} rate limit entries`,
        cleared,
      });
    } else {
      // Clear rate limit for specific IP (or current request IP)
      const targetIp = ip || getClientIp(req);
      const cleared = await clearRateLimit(targetIp);
      
      if (cleared) {
        return NextResponse.json({
          success: true,
          message: `Cleared rate limit for IP: ${targetIp}`,
          ip: targetIp,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to clear rate limit',
        }, { status: 500 });
      }
    }
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to clear rate limit' },
      { status: 500 }
    );
  }
}

