import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAINTENANCE_COOKIE = 'at_maintenance';

export async function GET() {
  try {
    const settings = await getSiteSettings();

    const response = NextResponse.json(
      {
        success: true,
        data: {
          maintenanceMode: settings.maintenanceMode,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    response.cookies.set({
      name: MAINTENANCE_COOKIE,
      value: settings.maintenanceMode ? '1' : '0',
      path: '/',
      maxAge: 60 * 5,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production'
        ? { domain: '.adoptrees.com' }
        : {}),
    });

    return response;
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
