import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { sendThankYouEmailWithCertificate } from '@/lib/email';
import { generateCertificate } from '@/lib/certificate';
import { logPaymentEvent, logError } from '@/lib/logger';

/**
 * API endpoint to retry sending thank you emails with certificates
 * POST /api/admin/retry-email
 * Body: { orderIds?: string[] } - if not provided, finds recent orders
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { orderIds } = body;

    let orders;

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Find specific orders
      orders = await Order.find({
        orderId: { $in: orderIds }
      })
        .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl certificate status paymentStatus createdAt')
        .lean();
    } else {
      // Find recent paid orders with certificates (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      orders = await Order.find({
        paymentStatus: 'paid',
        status: { $in: ['confirmed', 'planted', 'completed'] },
        $or: [
          { certificateUrl: { $exists: true, $ne: null } },
          { certificate: { $exists: true } }
        ],
        createdAt: { $gte: sevenDaysAgo }
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('orderId userId userEmail userName userType items isGift giftRecipientEmail giftRecipientName certificateUrl certificate status paymentStatus createdAt')
        .lean();
    }

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders found',
        results: {
          processed: 0,
          success: 0,
          failed: 0
        }
      });
    }

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; error: string }>
    };

    // Process each order
    for (const order of orders) {
      try {
        results.processed++;

        // Determine recipient
        const recipientEmail = order.isGift && order.giftRecipientEmail
          ? order.giftRecipientEmail
          : order.userEmail;
        const recipientName = order.isGift && order.giftRecipientName
          ? order.giftRecipientName
          : order.userName;

        if (!recipientEmail || !recipientEmail.includes('@')) {
          results.failed++;
          results.errors.push({
            orderId: order.orderId,
            error: `Invalid email address: ${recipientEmail}`
          });
          continue;
        }

        // Generate certificate on-demand (not stored)
        const user = await User.findById(order.userId).select('publicId qrCode image name companyName userType');

        if (!user || !user.publicId) {
          results.failed++;
          results.errors.push({
            orderId: order.orderId,
            error: 'User not found or missing publicId'
          });
          continue;
        }

        const treesCount = order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        const oxygenKgs = order.items.reduce((sum: number, item: { oxygenKgs: number; quantity: number }) => sum + (item.oxygenKgs * item.quantity), 0);
        const co2Kgs = order.items.reduce((sum: number, item: { oxygenKgs: number; co2Kgs?: number; quantity: number }) => {
          const itemCo2 = (item.co2Kgs !== undefined && item.co2Kgs !== null)
            ? item.co2Kgs * item.quantity
            : (item.oxygenKgs * 0.715) * item.quantity;
          return sum + itemCo2;
        }, 0);

        const treeNames: string[] = [];
        order.items.forEach((item: { treeName: string }) => {
          if (!treeNames.includes(item.treeName)) {
            treeNames.push(item.treeName);
          }
        });

        let certificateUserName: string;
        if (order.isGift && order.giftRecipientName) {
          certificateUserName = order.giftRecipientName;
        } else {
          if (user.userType === 'company') {
            certificateUserName = user.companyName || user.name || order.userName || 'Company';
          } else {
            certificateUserName = user.name || order.userName || 'User';
          }
        }

        const profilePicUrl = user.image || undefined;

        let certificateBuffer: Buffer;
        try {
          certificateBuffer = await generateCertificate({
            userName: certificateUserName,
            profilePicUrl: profilePicUrl,
            treesCount,
            oxygenKgs,
            co2Kgs,
            treeNames: treeNames.length > 0 ? treeNames : undefined,
            publicId: user.publicId,
            orderId: order.orderId,
            qrCode: user.qrCode,
          });
        } catch (certError) {
          results.failed++;
          results.errors.push({
            orderId: order.orderId,
            error: `Failed to generate certificate: ${certError instanceof Error ? certError.message : String(certError)}`
          });
          continue;
        }

        // Prepare dealer information if this is a dealer order
        let dealerInfo: { dealerName?: string; showroomName?: string; vehicleName?: string } | undefined;
        if (order.userType === 'dealer' && order.items.length > 0) {
          const firstItem = order.items[0] as { vehicleName?: string };
          dealerInfo = {
            dealerName: order.dealerName,
            showroomName: order.showroomName,
            vehicleName: firstItem.vehicleName
          };
        }
        
        // Send email
        const emailSent = await sendThankYouEmailWithCertificate(
          recipientEmail,
          recipientName,
          order.orderId,
          treesCount,
          certificateBuffer,
          dealerInfo // Pass dealer info for dealer orders
        );

        if (emailSent) {
          results.success++;
          logPaymentEvent('thank_you_email_retry_success', {
            orderId: order.orderId,
            recipientEmail,
            retriedBy: session.user.id
          });
        } else {
          results.failed++;
          results.errors.push({
            orderId: order.orderId,
            error: 'Email sending returned false'
          });
          logError('Thank you email retry failed', new Error('Email sending returned false'), {
            orderId: order.orderId,
            recipientEmail
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        results.errors.push({
          orderId: order.orderId,
          error: error instanceof Error ? error.message : String(error)
        });
        logError('Error retrying email for order', error as Error, {
          orderId: order.orderId
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} order(s)`,
      results
    });
  } catch (error) {
    logError('Error in retry-email endpoint', error as Error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

