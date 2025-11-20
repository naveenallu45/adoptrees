import { NextResponse } from 'next/server';

export async function GET() {
  // Fetch the Cloudinary favicon image
  const faviconUrl = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763652126/WhatsApp_Image_2025-11-20_at_8.13.58_PM_jzpbwb.jpg';
  
  try {
    const response = await fetch(faviconUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch favicon');
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (_error) {
    // Return a simple fallback if fetch fails
    return new NextResponse(null, { status: 404 });
  }
}

