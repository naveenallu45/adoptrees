import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Tree from '@/models/Tree';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/api-auth';

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

    // Check if user is admin
    const adminCheck = await requireAdmin();
    const isAdmin = adminCheck.authorized;

    // Find the order - admins can access any order, regular users only their own
    const orderQuery: { orderId: string; userId?: string } = { orderId };
    if (!isAdmin) {
      orderQuery.userId = session.user.id;
    }

    const order = await Order.findOne(orderQuery).select('+certificate');

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
      // Get user details including publicId, qrCode, profile image, and current name
      const user = await User.findById(order.userId).select('publicId qrCode image name');
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
      
      // Always regenerate QR code with current origin to ensure it works correctly
      // This ensures the QR code uses the same origin as the request (like dashboard does)
      let qrCodeToUse: string | undefined;
      try {
        // Use stored QR code if available (much faster)
        if (user.qrCode) {
          qrCodeToUse = user.qrCode;
        } else {
          // Generate QR code only if not stored
        const publicIdLower = user.publicId.toLowerCase();
        const qrUrl = `${origin}/u/${publicIdLower}`;
        
        // Use same settings as modal (width: 320 for better quality)
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        qrCodeToUse = qrDataUrl;
        
          // Update stored QR code asynchronously (don't block)
          user.qrCode = qrDataUrl;
          user.save().catch((err: Error) => console.error('Error saving QR code:', err));
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

      // Calculate total trees count, oxygen, and CO2 for this order
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
      
      // Fetch current tree CO2 values from database (same as tree detail view)
      // This ensures we use the exact CO2 value shown in "view more" section
      let co2Kgs = 0;
      const calculateCO2 = (oxygenKgs: number): number => {
        return Math.round(oxygenKgs * 1.4 * 10); // 10 years estimate - same as tree detail view
      };
      
      for (const item of order.items) {
        try {
          // Fetch current tree data from database to get exact CO2 value
          const tree = await Tree.findById(item.treeId).select('co2 oxygenKgs').lean();
          
          // Use the same calculation as tree detail view:
          // If tree.co2 exists, use Math.abs(tree.co2), otherwise calculate from oxygen
          const treeCo2 = tree?.co2 !== undefined && tree?.co2 !== null 
            ? Math.abs(tree.co2) // Use absolute value like tree detail view
            : calculateCO2(tree?.oxygenKgs || item.oxygenKgs);
          
          const itemCo2 = treeCo2 * item.quantity;
          co2Kgs += itemCo2;
          
          console.log('[CERTIFICATE] Tree CO2 from database:', {
            treeName: item.treeName,
            treeId: item.treeId,
            treeCo2FromDB: tree?.co2,
            treeCo2Abs: treeCo2,
            quantity: item.quantity,
            itemCo2Total: itemCo2
          });
        } catch (err) {
          // If tree fetch fails, fallback to order item value or calculate from oxygen
          console.warn('[CERTIFICATE] Failed to fetch tree data, using order item value:', err);
          const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null) 
            ? Math.abs(item.co2Kgs) * item.quantity
            : calculateCO2(item.oxygenKgs);
          co2Kgs += itemCo2;
        }
      }
      
      // Collect unique tree names from order items
      const treeNames: string[] = [];
      order.items.forEach(item => {
        // Add tree name if not already in the list
        if (!treeNames.includes(item.treeName)) {
          treeNames.push(item.treeName);
        }
      });

      // Get profile image URL (from user model or session)
      const profilePicUrl = user.image || session.user.image || undefined;

      // For gift orders, use gift recipient name; otherwise use current user name
      // Use current user name from User model or session (not the old order.userName)
      // This ensures the certificate always shows the latest updated name
      const currentUserName = order.isGift && order.giftRecipientName 
        ? order.giftRecipientName 
        : (user.name || session.user.name || order.userName || 'User');

      // Generate certificate - use QR code with correct origin (matches dashboard)
      const { generateCertificate } = await import('@/lib/certificate');
      const certificateBuffer = await generateCertificate({
        userName: currentUserName,
        profilePicUrl: profilePicUrl,
        treesCount,
        oxygenKgs,
        co2Kgs: co2Kgs, // Always pass CO2 (calculated from items or oxygen)
        treeNames: treeNames.length > 0 ? treeNames : undefined,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: qrCodeToUse, // Use QR code with current request origin
      });
      
      // Debug logging
      console.log('[CERTIFICATE] Generated certificate with:', {
        treesCount,
        oxygenKgs,
        co2Kgs,
        treeNamesCount: treeNames.length,
        treeNames: treeNames.slice(0, 3) // Log first 3 tree names
      });

      // Store certificate in order asynchronously (don't block response)
      // This allows the certificate to be returned immediately while saving happens in background
        order.certificate = certificateBuffer;
      order.save().catch(saveError => {
        console.error('Error saving certificate to database:', saveError);
        // Non-blocking - certificate was already returned to user
      });
      
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

