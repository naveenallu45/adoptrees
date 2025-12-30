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

    // Find the order - admins can access any order, regular users only their own or if they are the customer (for dealer orders)
    let order;
    if (isAdmin) {
      // Admins can access any order
      order = await Order.findOne({ orderId }).select('+certificate');
    } else {
      // Regular users can access:
      // 1. Orders where they are the buyer (userId matches)
      // 2. Orders where they are the customer (customerUserId matches) - for dealer orders
      // 3. Orders where they are the gift recipient (giftRecipientEmail matches)
      const userIdString = String(session.user.id);
      const userEmail = session.user.email?.toLowerCase().trim();
      
      order = await Order.findOne({
        orderId,
        $or: [
          { userId: userIdString },
          { userId: session.user.id }, // Also check ObjectId format
          { customerUserId: userIdString }, // For dealer orders where user is the customer
          { customerUserId: session.user.id }, // Also check ObjectId format
          ...(userEmail ? [
            { userEmail: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            { giftRecipientEmail: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            { 'items.customerEmail': new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            { 'items.recipientEmail': new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          ] : [])
        ]
      }).select('+certificate');
    }

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

    // Always regenerate certificate with latest user details (profile picture, name, etc.)
    // The stored certificate in Cloudinary is only for email attachment
    // When user downloads, we want to show their current profile
    try {
      // For dealer orders, use customer's account (customerUserId) instead of dealer's account
      // This ensures we use the customer's existing QR code and public ID
      const userIdToUse = (order.userType === 'dealer' && order.customerUserId) 
        ? order.customerUserId 
        : order.userId;
      
      // Get user details including publicId, qrCode, profile image, name, companyName, and userType
      // Always fetch latest profile data to ensure certificate shows current profile
      const user = await User.findById(userIdToUse).select('publicId qrCode image name companyName userType');
      if (!user || !user.publicId) {
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
        if (user.qrCode !== qrDataUrl) {
          user.qrCode = qrDataUrl;
          user.save().catch((err: Error) => console.error('Error saving QR code:', err));
        }
      } catch (qrError) {
        console.error('[CERTIFICATE] Error generating QR code:', qrError);
        // Fallback to stored QR code if available (shouldn't happen, but safety net)
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

      // For dealer orders, always use customer's account info (not dealer's)
      // We already fetched the customer's account via customerUserId, so use that
      let currentUserName: string;
      let currentProfilePicUrl: string | undefined;
      
      if (order.userType === 'dealer' && order.customerUserId) {
        // For dealer orders, use customer's account name and profile picture
        // Never use dealer's info - always use customer's account data
        currentUserName = user.name || 'Customer';
        currentProfilePicUrl = user.image || undefined;
      } else if (order.isGift && order.giftRecipientName) {
        // For gift orders, use gift recipient name
        currentUserName = order.giftRecipientName;
        currentProfilePicUrl = user.image || session.user.image || undefined;
      } else {
        // For regular orders, use the user's account info
        // Prefer userType-specific name: companyName for companies, name for individuals
        if (user.userType === 'company' || user.userType === 'dealer') {
          currentUserName = user.companyName || user.name || session.user.name || order.userName || (user.userType === 'dealer' ? 'Dealer' : 'Company');
        } else {
          currentUserName = user.name || session.user.name || order.userName || 'User';
        }
        currentProfilePicUrl = user.image || session.user.image || undefined;
      }
      
      console.log('[CERTIFICATE] User profile data:', {
        userId: user._id,
        userType: user.userType,
        orderUserType: order.userType,
        isDealerOrder: order.userType === 'dealer',
        hasImage: !!currentProfilePicUrl,
        imageUrl: currentProfilePicUrl ? currentProfilePicUrl.substring(0, 50) + '...' : 'none',
        userName: currentUserName,
        companyName: user.companyName
      });
      
      console.log('[CERTIFICATE] Using userName:', currentUserName, 'profilePicUrl:', currentProfilePicUrl ? 'present' : 'missing');

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
          console.warn('[CERTIFICATE] Error fetching dealer profile:', dealerError);
        }
      }

      // Generate certificate - use QR code with correct origin (matches dashboard)
      const { generateCertificate } = await import('@/lib/certificate');
      const certificateBuffer = await generateCertificate({
        userName: currentUserName,
        profilePicUrl: currentProfilePicUrl,
        treesCount,
        oxygenKgs,
        co2Kgs: co2Kgs, // Always pass CO2 (calculated from items or oxygen)
        treeNames: treeNames.length > 0 ? treeNames : undefined,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: qrCodeToUse, // Use QR code with current request origin
        dealerName, // Dealer name for dealer orders
        vehicleName, // Vehicle name for dealer orders
        dealerImageUrl, // Dealer profile image for dealer orders
      });
      
      // Debug logging
      console.log('[CERTIFICATE] Generated certificate with latest user details:', {
        treesCount,
        oxygenKgs,
        co2Kgs,
        treeNamesCount: treeNames.length,
        treeNames: treeNames.slice(0, 3), // Log first 3 tree names
        userName: currentUserName,
        hasProfilePic: !!currentProfilePicUrl
      });

      // Return the freshly generated certificate with latest user details
      // Note: We don't save this to database - the stored certificate in Cloudinary
      // is only for email attachment. Downloads always use latest profile data.
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

