import { NextResponse } from 'next/server';
// Import to trigger auto-initialization
import '@/lib/cron/growth-updates';

// Initialize cron jobs
// This route can be called on server startup or manually
// The cron job will auto-start when the module is imported (server-side only)
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cron jobs initialized successfully. Growth update cron job runs daily at 2:00 AM UTC.'
    });
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize cron jobs' },
      { status: 500 }
    );
  }
}

