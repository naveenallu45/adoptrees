import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Initialize cron jobs
// This route can be called on server startup or manually
export async function GET() {
  try {
    // Load cron modules only when this endpoint is called. Top-level imports can
    // start node-cron during `next build` and keep the build process alive.
    await Promise.all([
      import('@/lib/cron/growth-updates'),
      import('@/lib/cron/quarterly-task'),
      import('@/lib/cron/marketing-emails'),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Cron jobs initialized successfully. Growth update cron job runs daily at 2:00 AM UTC. Quarterly (90-day) cron job checks daily at 3:00 AM UTC and executes every 90 days. Marketing email cron job runs daily at 4:00 AM UTC and sends emails to users who haven\'t received one in 10+ days.'
    });
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize cron jobs' },
      { status: 500 }
    );
  }
}

