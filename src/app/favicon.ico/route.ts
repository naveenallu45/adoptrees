import { NextResponse } from 'next/server';

export async function GET() {
  // Fetch the Cloudinary favicon image with rounded corners transformation
  // w_64,h_64,c_fill makes it square, r_max makes it fully rounded (circular)
  const faviconUrl = 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_64,h_64,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png';
  
  try {
    const response = await fetch(faviconUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch favicon');
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (_error) {
    // Return a simple fallback if fetch fails
    return new NextResponse(null, { status: 404 });
  }
}

