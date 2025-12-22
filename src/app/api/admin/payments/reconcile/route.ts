import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-auth';
import { reconcileOrderPayment, reconcileAllInconsistentOrders } from '@/lib/payment-reconciliation';
import { logPaymentEvent, logError } from '@/lib/logger';

/**
 * POST /api/admin/payments/reconcile
 * Reconcile a specific order or all inconsistent orders
 * 
 * Body:
 * - orderId (optional): Specific order to reconcile
 * - all (optional): Reconcile all inconsistent orders
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();
    const { orderId, all } = body;

    if (all) {
      // Reconcile all inconsistent orders
      logPaymentEvent('admin_reconciliation_all_triggered', {});
      
      const result = await reconcileAllInconsistentOrders();
      
      return NextResponse.json({
        success: true,
        message: 'Reconciliation completed',
        data: {
          totalChecked: result.totalChecked,
          reconciled: result.reconciled,
          errors: result.errors,
          details: result.details
        }
      });
    } else if (orderId) {
      // Reconcile specific order
      logPaymentEvent('admin_reconciliation_single_triggered', { orderId });
      
      const result = await reconcileOrderPayment(orderId);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          data: {
            action: result.action,
            details: result.details
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.message
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either orderId or all=true must be provided'
      }, { status: 400 });
    }

  } catch (error) {
    logError('Error in admin payment reconciliation', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to reconcile payments' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/payments/reconcile
 * Get status of orders that need reconciliation
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Find orders that might need reconciliation
    const Order = (await import('@/models/Order')).default;
    
    const inconsistentOrders = await Order.find({
      $or: [
        {
          paymentStatus: 'paid',
          $or: [
            { certificate: { $exists: false } },
            { assignedWellwisher: { $exists: false } },
            { 'wellwisherTasks.0': { $exists: false } }
          ]
        },
        {
          paymentStatus: 'failed',
          paymentId: { $exists: true, $ne: null }
        }
      ]
    })
    .select('orderId paymentStatus status paymentId razorpayOrderId createdAt totalAmount userName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    return NextResponse.json({
      success: true,
      data: {
        count: inconsistentOrders.length,
        orders: inconsistentOrders.map(order => ({
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          status: order.status,
          hasPaymentId: !!order.paymentId,
          hasRazorpayOrderId: !!order.razorpayOrderId,
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          userName: order.userName
        }))
      }
    });

  } catch (error) {
    logError('Error fetching reconciliation status', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reconciliation status' },
      { status: 500 }
    );
  }
}

