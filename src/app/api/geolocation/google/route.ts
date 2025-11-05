import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(_req: NextRequest) {
  try {
    const apiKey = env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Use considerIp=true; Google will infer location from caller IP (server IP);
    // For dev via tunnel, accuracy may be coarse. This is a best-effort fallback.
    const googleRes = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true })
    });

    const data = await googleRes.json();
    if (!googleRes.ok) {
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Google Geolocation API failed' },
        { status: googleRes.status }
      );
    }

    const lat = data?.location?.lat;
    const lng = data?.location?.lng;
    const accuracy = data?.accuracy; // meters

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid response from Google Geolocation API' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
        accuracy
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch location from Google' },
      { status: 500 }
    );
  }
}


