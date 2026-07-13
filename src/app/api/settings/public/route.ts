import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSiteSettings();

    return NextResponse.json(
      {
        success: true,
        data: {
          maintenanceMode: settings.maintenanceMode,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json(
      {
        success: true,
        data: {
          maintenanceMode: false,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
