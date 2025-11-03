import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { checkRedisHealth } from '@/lib/redis-rate-limit';
import { logInfo, logError } from '@/lib/logger';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const healthChecks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
        redis: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
        memory: { status: 'healthy', usage: process.memoryUsage() },
      },
    };

    // Check database connection
    try {
      const dbStart = Date.now();
      await connectDB();
      const dbTime = Date.now() - dbStart;
      
      healthChecks.checks.database = {
        status: 'healthy',
        responseTime: dbTime,
        error: undefined,
      };
      
      logInfo('Database health check passed', { responseTime: dbTime });
    } catch (_error) {
      healthChecks.checks.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: _error instanceof Error ? _error.message : 'Unknown error',
      };
      
      logError('Database health check failed', _error as Error);
    }

    // Check Redis connection
    try {
      const redisStart = Date.now();
      const redisHealthy = await checkRedisHealth();
      const redisTime = Date.now() - redisStart;
      
      healthChecks.checks.redis = {
        status: redisHealthy ? 'healthy' : 'unhealthy',
        responseTime: redisTime,
        error: undefined,
      };
      
      logInfo('Redis health check completed', { 
        healthy: redisHealthy, 
        responseTime: redisTime 
      });
    } catch (_error) {
      healthChecks.checks.redis = {
        status: 'unhealthy',
        responseTime: 0,
        error: _error instanceof Error ? _error.message : 'Unknown error',
      };
      
      logError('Redis health check failed', _error as Error);
    }

    // Determine overall health status
    const allHealthy = Object.values(healthChecks.checks).every(
      check => check.status === 'healthy'
    );
    
    healthChecks.status = allHealthy ? 'healthy' : 'degraded';

    const totalTime = Date.now() - startTime;
    
    return NextResponse.json(healthChecks, {
      status: allHealthy ? 200 : 503,
      headers: {
        'X-Response-Time': `${totalTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (_error) {
    logError('Health check endpoint failed', _error as Error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

// Simple ping endpoint
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Status': 'OK',
      'Cache-Control': 'no-cache',
    },
  });
}
