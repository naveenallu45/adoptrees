import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { orderId } = await params;

    // Find the order and include certificate field
    const order = await Order.findOne({ 
      orderId,
      userId: session.user.id 
    }).select('+certificate');

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is paid/confirmed
    if (order.paymentStatus !== 'paid' && order.status !== 'confirmed' && order.status !== 'planted' && order.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Certificate is only available for paid orders' },
        { status: 400 }
      );
    }

    // Always regenerate certificate to ensure QR code has correct origin
    // This ensures the QR code always works regardless of where it's accessed from
    // The QR code URL must match the current request origin (localhost in dev, production in prod)
    try {
      // Get user details including publicId and qrCode
      const user = await User.findById(order.userId).select('publicId qrCode');
      if (!user || !user.publicId) {
        return NextResponse.json(
          { success: false, error: 'User publicId not found. Cannot generate certificate.' },
          { status: 400 }
        );
      }

      // Get origin from request URL to ensure QR code uses correct URL (matches dashboard behavior)
      // Extract origin from the request URL itself - most reliable method
      const requestUrl = new URL(request.url);
      const origin = `${requestUrl.protocol}//${requestUrl.host}`;
      console.log(`Certificate request origin detected: ${origin}`);
      
      // Always regenerate QR code with current origin to ensure it works correctly
      // This ensures the QR code uses the same origin as the request (like dashboard does)
      let qrCodeToUse: string | undefined;
      try {
        // Ensure publicId is lowercase (matching API route expectation)
        const publicIdLower = user.publicId.toLowerCase();
        const qrUrl = `${origin}/u/${publicIdLower}`;
        console.log(`[CERTIFICATE] Generating QR code with URL: ${qrUrl}`);
        console.log(`[CERTIFICATE] Origin: ${origin}, PublicId: ${publicIdLower}`);
        
        // Use same settings as modal (width: 320 for better quality)
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        qrCodeToUse = qrDataUrl;
        console.log(`[CERTIFICATE] QR code generated successfully for URL: ${qrUrl}`);
        
        // Update stored QR code if it's different (for future use)
        if (!user.qrCode || user.qrCode !== qrDataUrl) {
          user.qrCode = qrDataUrl;
          await user.save();
          console.log(`[CERTIFICATE] QR code updated for user ${user.publicId} with origin ${origin}`);
        }
      } catch (qrError) {
        console.error('[CERTIFICATE] Error generating QR code:', qrError);
        // Fallback to stored QR code if available
        qrCodeToUse = user.qrCode;
        if (qrCodeToUse) {
          console.log(`[CERTIFICATE] Using stored QR code as fallback`);
        } else {
          console.error('[CERTIFICATE] No QR code available - certificate generation may fail');
        }
      }

      // Calculate total trees count and oxygen for this order
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);

      // Generate certificate - use QR code with correct origin (matches dashboard)
      const { generateCertificate } = await import('@/lib/certificate');
      const certificateBuffer = await generateCertificate({
        userName: order.userName,
        profilePicUrl: undefined,
        treesCount,
        oxygenKgs,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: qrCodeToUse, // Use QR code with current request origin
      });

      // Store certificate in order
      try {
        order.certificate = certificateBuffer;
        await order.save();
        console.log(`Certificate saved successfully for order ${orderId}, size: ${certificateBuffer.length} bytes`);
      } catch (saveError) {
        console.error('Error saving certificate to database:', saveError);
        // Continue anyway - we can still return the certificate even if save fails
        // The certificate will be regenerated on next request
      }
      
      // Use the certificate buffer we just generated (don't reload from DB)
      // Return the PDF certificate immediately
      // Convert Buffer to Uint8Array for NextResponse compatibility
      const pdfArrayBuffer = new Uint8Array(certificateBuffer);
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${orderId}.pdf"`,
          'Content-Length': certificateBuffer.length.toString(),
        },
      });
    } catch (certError) {
      console.error('[CERTIFICATE] Error generating certificate on demand:', certError);
      const errorMessage = certError instanceof Error ? certError.message : 'Unknown error';
      console.error('[CERTIFICATE] Full error details:', certError);
      return NextResponse.json(
        { success: false, error: `Failed to generate certificate: ${errorMessage}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error downloading certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download certificate' },
      { status: 500 }
    );
  }
}

