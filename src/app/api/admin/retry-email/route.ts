import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { processOrderCompletion } from '@/lib/order-processing';
import { logError } from '@/lib/logger';

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

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds } = body;

    let orders;

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Find specific orders
      orders = await Order.find({
        orderId: { $in: orderIds },
        paymentStatus: 'paid'
      });
    } else {
      // Find recent paid orders that still need one or more emails/assignment actions.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      orders = await Order.find({
        paymentStatus: 'paid',
        status: { $in: ['confirmed', 'planted', 'completed'] },
        $or: [
          { thankYouEmailSentAt: { $exists: false } },
          { thankYouEmailSentAt: null },
          { wellwisherTaskEmailSentAt: { $exists: false } },
          { wellwisherTaskEmailSentAt: null },
          { assignedWellwisher: { $exists: false } },
          { assignedWellwisher: null },
          { 'wellwisherTasks.0': { $exists: false } },
          { isGift: true, giftRecipientGreetingEmailSentAt: { $exists: false } },
          { isGift: true, giftRecipientGreetingEmailSentAt: null }
        ],
        createdAt: { $gte: sevenDaysAgo }
      })
        .sort({ createdAt: -1 })
        .limit(20);
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

        const completionResult = await processOrderCompletion(order);

        if (completionResult.success && completionResult.completed.email) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            orderId: order.orderId,
            error: completionResult.error || 'Order completion did not send all required emails'
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

