import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Tree from '@/models/Tree';
import QRCode from 'qrcode';

// Disable caching for public routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Safely escape RegExp special characters in a string
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string; orderId: string }> }
) {
  try {
    await connectDB();

    const { publicId: publicIdParam, orderId: orderIdParam } = await params;
    const rawPublicId = (publicIdParam || '').trim();
    
    if (!rawPublicId) {
      return NextResponse.json({ success: false, error: 'Invalid public ID' }, { status: 400 });
    }
    
    // Query user by publicId (case-insensitive to support legacy mixed-case IDs)
    const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
    const userDoc = await User.findOne({ publicId: publicIdRegex }).select('publicId qrCode image name email').lean();
    
    if (!userDoc || !('_id' in userDoc) || !('publicId' in userDoc)) {
      console.error(`[PublicCertificate] User not found for publicId: ${rawPublicId} when fetching certificate for order ${orderIdParam}`);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = {
      _id: userDoc._id,
      publicId: userDoc.publicId as string,
      qrCode: 'qrCode' in userDoc ? userDoc.qrCode as string | undefined : undefined,
      image: 'image' in userDoc ? userDoc.image as string | undefined : undefined,
      name: 'name' in userDoc ? userDoc.name as string | undefined : undefined,
      email: 'email' in userDoc ? userDoc.email as string | undefined : undefined,
    };
    
    // Find the specific order - only paid orders
    const order = await Order.findOne({
      $or: [
        { orderId: orderIdParam, userId: String(user._id) },
        { orderId: orderIdParam, userEmail: user.email },
        { _id: orderIdParam, userId: String(user._id) },
        { _id: orderIdParam, userEmail: user.email }
      ],
      paymentStatus: 'paid' // Only show paid orders for public viewing
    }).select('+certificate');

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found or not paid' }, { status: 404 });
    }

    // Check if order is paid/confirmed
    if (order.paymentStatus !== 'paid' && order.status !== 'confirmed' && order.status !== 'planted' && order.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Certificate is only available for paid orders' },
        { status: 400 }
      );
    }

    // Generate certificate (similar to authenticated endpoint)
    try {
      if (!user.publicId) {
        return NextResponse.json(
          { success: false, error: 'User publicId not found. Cannot generate certificate.' },
          { status: 400 }
        );
      }

      // Get origin from request URL to ensure QR code uses correct URL
      const requestUrl = new URL(request.url);
      const origin = `${requestUrl.protocol}//${requestUrl.host}`;
      
      // Use stored QR code if available, otherwise generate one
      let qrCodeToUse: string | undefined;
      try {
        if (user.qrCode) {
          qrCodeToUse = user.qrCode;
        } else {
          const publicIdLower = user.publicId.toLowerCase();
          const qrUrl = `${origin}/u/${publicIdLower}`;
          
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
            width: 320,
            margin: 1,
            errorCorrectionLevel: 'M'
          });
          
          qrCodeToUse = qrDataUrl;
        }
      } catch (qrError) {
        console.error('[PublicCertificate] Error generating QR code:', qrError);
        qrCodeToUse = user.qrCode;
        if (!qrCodeToUse) {
          console.error('[PublicCertificate] No QR code available - certificate generation may fail');
        }
      }

      // Calculate total trees count, oxygen, and CO2 for this order
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
      
      // Fetch current tree CO2 values from database
      let co2Kgs = 0;
      const calculateCO2 = (oxygenKgs: number): number => {
        return Math.round(oxygenKgs * 1.4 * 10); // 10 years estimate
      };
      
      for (const item of order.items) {
        try {
          const tree = await Tree.findById(item.treeId).select('co2 oxygenKgs').lean();
          
          const treeCo2 = tree?.co2 !== undefined && tree?.co2 !== null 
            ? Math.abs(tree.co2)
            : calculateCO2(tree?.oxygenKgs || item.oxygenKgs);
          
          const itemCo2 = treeCo2 * item.quantity;
          co2Kgs += itemCo2;
        } catch (err) {
          console.warn('[PublicCertificate] Failed to fetch tree data, using order item value:', err);
          const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null) 
            ? Math.abs(item.co2Kgs) * item.quantity
            : calculateCO2(item.oxygenKgs);
          co2Kgs += itemCo2;
        }
      }
      
      // Collect unique tree names from order items
      const treeNames: string[] = [];
      order.items.forEach(item => {
        if (!treeNames.includes(item.treeName)) {
          treeNames.push(item.treeName);
        }
      });

      // Get profile image URL
      const profilePicUrl = user.image || undefined;

      // For gift orders, use gift recipient name; otherwise use user name
      const currentUserName = order.isGift && order.giftRecipientName 
        ? order.giftRecipientName 
        : (user.name || order.userName || 'User');

      // Generate certificate
      const { generateCertificate } = await import('@/lib/certificate');
      const certificateBuffer = await generateCertificate({
        userName: currentUserName,
        profilePicUrl: profilePicUrl,
        treesCount,
        oxygenKgs,
        co2Kgs: co2Kgs,
        treeNames: treeNames.length > 0 ? treeNames : undefined,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: qrCodeToUse,
      });
      
      // Return the PDF certificate
      const pdfArrayBuffer = new Uint8Array(certificateBuffer);
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${orderIdParam}.pdf"`,
          'Content-Length': certificateBuffer.length.toString(),
        },
      });
    } catch (certError) {
      console.error('[PublicCertificate] Error generating certificate:', certError);
      const errorMessage = certError instanceof Error ? certError.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: `Failed to generate certificate: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[PublicCertificate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download certificate' },
      { status: 500 }
    );
  }
}

