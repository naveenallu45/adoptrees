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

// Simple ObjectId validator to avoid CastErrors for non-hex order IDs
function isLikelyObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string; orderId: string }> }
) {
  let orderIdParam: string | undefined;
  let rawPublicId: string | undefined;
  
  try {
    await connectDB();

    const { publicId: publicIdParam, orderId } = await params;
    orderIdParam = orderId;
    rawPublicId = (publicIdParam || '').trim();
    
    if (!rawPublicId) {
      return NextResponse.json({ success: false, error: 'Invalid public ID' }, { status: 400 });
    }
    
    // Query user by publicId (case-insensitive to support legacy mixed-case IDs)
    // Always fetch latest profile data including companyName and userType
    const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
    const userDoc = await User.findOne({ publicId: publicIdRegex }).select('_id publicId qrCode image name companyName userType email').lean();
    
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
      companyName: 'companyName' in userDoc ? userDoc.companyName as string | undefined : undefined,
      userType: 'userType' in userDoc ? userDoc.userType as string | undefined : undefined,
      email: 'email' in userDoc ? userDoc.email as string | undefined : undefined,
    };
    
    console.log('[PublicCertificate] User profile data:', {
      publicId: user.publicId,
      hasImage: !!user.image,
      imageUrl: user.image ? user.image.substring(0, 50) + '...' : 'none',
      userName: user.name,
      companyName: user.companyName,
      userType: user.userType
    });
    
    // Build a safe query for the specific order - only paid orders
    const orConditions: Record<string, unknown>[] = [
      { orderId: orderIdParam, userId: String(user._id) },
      { orderId: orderIdParam, userEmail: user.email },
    ];

    // Only query by _id when the parameter looks like a valid ObjectId
    if (isLikelyObjectId(orderIdParam)) {
      orConditions.push(
        { _id: orderIdParam, userId: String(user._id) },
        { _id: orderIdParam, userEmail: user.email }
      );
    }

    const order = await Order.findOne({
      $or: orConditions,
      paymentStatus: 'paid', // Only show paid orders for public viewing
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

    // Always regenerate certificate with latest user details (profile picture, name, etc.)
    // The stored certificate in Cloudinary is only for email attachment
    // When user downloads, we want to show their current profile
    try {
      if (!user.publicId) {
        return NextResponse.json(
          { success: false, error: 'User publicId not found. Cannot generate certificate.' },
          { status: 400 }
        );
      }

      // QR codes in certificates must ALWAYS use production URL (not localhost)
      // Always regenerate QR code for certificates to ensure it uses production URL
      // We can't reliably detect localhost in base64-encoded QR images, so always regenerate
      let qrCodeToUse: string | undefined;
      try {
        // Always use production URL for certificates
        const origin = 'https://adoptrees.com';
          const publicIdLower = user.publicId.toLowerCase();
          const qrUrl = `${origin}/u/${publicIdLower}`;
          
        // Always regenerate QR code with production URL for certificates
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
            width: 320,
            margin: 1,
            errorCorrectionLevel: 'M'
          });
          
          qrCodeToUse = qrDataUrl;
        
        // Update stored QR code asynchronously if it's different (don't block certificate generation)
        // This ensures future certificates also use the correct URL
        // Note: QR code updates are protected by User model hooks, but we only update if different
        // so it should be allowed. If blocked, we silently continue - certificate generation is not affected.
        if (user.qrCode !== qrDataUrl && user._id) {
          // Use findByIdAndUpdate since user is a lean document (plain object)
          // This is async and non-blocking - certificate generation continues regardless
          User.findByIdAndUpdate(
            user._id,
            { $set: { qrCode: qrDataUrl } },
            { new: false } // Don't need to return the updated document
          ).catch((err: Error) => {
            // Log but don't fail certificate generation - QR code update is optional
            console.warn('[PublicCertificate] QR code update failed (non-critical):', err.message);
          });
        }
      } catch (qrError) {
        console.error('[PublicCertificate] Error generating QR code:', qrError);
        // Fallback to stored QR code if available (shouldn't happen, but safety net)
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

      // For dealer orders, always use customer's account info (not dealer's)
      // The user is already the customer (fetched by publicId), so use their account data
      let currentUserName: string;
      let currentProfilePicUrl: string | undefined;
      
      if (order.userType === 'dealer' && order.customerUserId) {
        // For dealer orders, use customer's account name and profile picture
        // Never use dealer's info - always use customer's account data
        // The user is already the customer (accessed via their publicId)
        currentUserName = user.name || 'Customer';
        currentProfilePicUrl = user.image || undefined;
      } else if (order.isGift && order.giftRecipientName) {
        // For gift orders, use gift recipient name
        currentUserName = order.giftRecipientName;
        currentProfilePicUrl = user.image || undefined;
      } else {
        // For regular orders, use the user's account info
        // Prefer userType-specific name: companyName for companies, name for individuals
        if (user.userType === 'company' || user.userType === 'dealer') {
          currentUserName = user.companyName || user.name || order.userName || (user.userType === 'dealer' ? 'Dealer' : 'Company');
        } else {
          currentUserName = user.name || order.userName || 'User';
        }
        currentProfilePicUrl = user.image || undefined;
      }
      
      console.log('[PublicCertificate] Using userName:', currentUserName, 'profilePicUrl:', currentProfilePicUrl ? 'present' : 'missing');

      // Get dealer and vehicle info for dealer orders
      let dealerName: string | undefined;
      let vehicleName: string | undefined;
      let dealerImageUrl: string | undefined;
      if (order.userType === 'dealer' && order.items.length > 0) {
        dealerName = order.dealerName || order.showroomName || order.userName;
        const firstItem = order.items[0] as { vehicleName?: string };
        vehicleName = firstItem.vehicleName;
        
        // Fetch dealer profile information
        try {
          const dealer = await User.findById(order.userId).select('name companyName image').lean();
          if (dealer) {
            // Use companyName for dealers if available, otherwise name
            if (!dealerName) {
              dealerName = dealer.companyName || dealer.name || order.userName;
            }
            dealerImageUrl = dealer.image || undefined;
          }
        } catch (dealerError) {
          console.warn('[PublicCertificate] Error fetching dealer profile:', dealerError);
        }
      }

      // Generate certificate
      const { generateCertificate } = await import('@/lib/certificate');
      const certificateBuffer = await generateCertificate({
        userName: currentUserName,
        profilePicUrl: currentProfilePicUrl,
        treesCount,
        oxygenKgs,
        co2Kgs: co2Kgs,
        treeNames: treeNames.length > 0 ? treeNames : undefined,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: qrCodeToUse,
        dealerName, // Dealer name for dealer orders
        vehicleName, // Vehicle name for dealer orders
        dealerImageUrl, // Dealer profile image for dealer orders
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
      console.error('[PublicCertificate] Certificate generation error details:', {
        message: errorMessage,
        stack: certError instanceof Error ? certError.stack : undefined,
        orderId: orderIdParam,
        publicId: rawPublicId
      });
      return NextResponse.json(
        { success: false, error: `Failed to generate certificate: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[PublicCertificate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PublicCertificate] Request error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      orderId: orderIdParam,
      publicId: rawPublicId
    });
    return NextResponse.json(
      { success: false, error: `Failed to download certificate: ${errorMessage}` },
      { status: 500 }
    );
  }
}

