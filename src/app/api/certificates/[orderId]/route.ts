import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Tree from '@/models/Tree';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/api-auth';
import { logPaymentEvent } from '@/lib/logger';

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

    // If certificate URL exists in Cloudinary, fetch and return it (preferred method)
    if (order.certificateUrl) {
      try {
        logPaymentEvent('certificate_downloaded_from_cloudinary', {
          orderId: order.orderId,
          certificateUrl: order.certificateUrl
        });
        
        // Fetch PDF from Cloudinary
        const response = await fetch(order.certificateUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch certificate from Cloudinary: ${response.statusText}`);
        }
        
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        
        // Return the PDF
        const pdfArrayBuffer = new Uint8Array(pdfBuffer);
        return new NextResponse(pdfArrayBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificate-${orderId}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (fetchError) {
        console.error('[CERTIFICATE] Error fetching from Cloudinary, falling back to buffer:', fetchError);
        // Fall through to buffer check below
      }
    }

    // Fallback: If no Cloudinary URL, check if certificate buffer exists
    if (order.certificate) {
      // Return the stored certificate buffer
      const pdfArrayBuffer = new Uint8Array(order.certificate);
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${orderId}.pdf"`,
          'Content-Length': order.certificate.length.toString(),
        },
      });
    }

    // Last resort: Regenerate certificate if neither URL nor buffer exists
    // This should rarely happen, but ensures backward compatibility
    console.warn(`[CERTIFICATE] Regenerating certificate for order ${orderId} - no stored certificate found`);
    try {
      // Get user details including publicId, qrCode, profile image, name, companyName, and userType
      // Always fetch latest profile data to ensure certificate shows current profile
      const user = await User.findById(order.userId).select('publicId qrCode image name companyName userType');
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

      // Get latest profile image URL from user model (users frequently change their profile)
      // Always fetch fresh from database to ensure certificate uses current profile picture
      const profilePicUrl = user.image || session.user.image || undefined;
      
      console.log('[CERTIFICATE] User profile data:', {
        userId: user._id,
        hasImage: !!user.image,
        imageUrl: user.image ? user.image.substring(0, 50) + '...' : 'none',
        userName: user.name,
        companyName: user.companyName,
        userType: user.userType
      });

      // For gift orders, use gift recipient name; otherwise use current user name
      // Use current user name from User model or session (not the old order.userName)
      // For company users, prefer companyName; for individuals, use name
      // This ensures the certificate always shows the latest updated name
      let currentUserName: string;
      if (order.isGift && order.giftRecipientName) {
        currentUserName = order.giftRecipientName;
      } else {
        // Prefer userType-specific name: companyName for companies, name for individuals
        if (user.userType === 'company') {
          currentUserName = user.companyName || user.name || session.user.name || order.userName || 'Company';
        } else {
          currentUserName = user.name || session.user.name || order.userName || 'User';
        }
      }
      
      console.log('[CERTIFICATE] Using userName:', currentUserName, 'profilePicUrl:', profilePicUrl ? 'present' : 'missing');

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

