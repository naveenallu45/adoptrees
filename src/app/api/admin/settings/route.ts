import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings';

const MAINTENANCE_COOKIE = 'at_maintenance';

function withMaintenanceCookie(
  response: NextResponse,
  maintenanceMode: boolean
) {
  response.cookies.set({
    name: MAINTENANCE_COOKIE,
    value: maintenanceMode ? '1' : '0',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(process.env.NODE_ENV === 'production'
      ? { domain: '.adoptrees.com' }
      : {}),
  });
  return response;
}

export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const settings = await getSiteSettings();

    return withMaintenanceCookie(
      NextResponse.json({
        success: true,
        data: settings,
      }),
      settings.maintenanceMode
    );
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();

    if (typeof body.maintenanceMode !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'maintenanceMode must be a boolean' },
        { status: 400 }
      );
    }

    const settings = await updateSiteSettings({
      maintenanceMode: body.maintenanceMode,
    });

    return withMaintenanceCookie(
      NextResponse.json({
        success: true,
        data: settings,
        message: settings.maintenanceMode
          ? 'Maintenance mode enabled'
          : 'Maintenance mode disabled',
      }),
      settings.maintenanceMode
    );
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
