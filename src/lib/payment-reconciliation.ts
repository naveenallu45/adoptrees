import Razorpay from 'razorpay';
import Order from '@/models/Order';
import { logPaymentEvent, logError } from '@/lib/logger';
import { processOrderCompletion } from './order-processing';

// Lazy initialization of Razorpay
// Always uses company account if configured, otherwise falls back to regular
function getRazorpayInstance(_userType?: 'individual' | 'company' | 'dealer' | 'hockey-india') {
  // Always use company Razorpay account if configured
  const companyKeyId = process.env.RAZORPAY_COMPANY_KEY_ID;
  const companyKeySecret = process.env.RAZORPAY_COMPANY_KEY_SECRET;
  
  if (companyKeyId && companyKeySecret) {
    return new Razorpay({
      key_id: companyKeyId,
      key_secret: companyKeySecret,
    });
  }
  
  // Default: use regular Razorpay account if company account not configured
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * Verify payment status with Razorpay API
 * Returns the actual payment status from Razorpay
 * userType: Optional user type to determine which Razorpay account to use
 */
export async function verifyPaymentStatusWithRazorpay(
  paymentId: string,
  userType?: 'individual' | 'company' | 'dealer' | 'hockey-india'
): Promise<{
  status: 'authorized' | 'captured' | 'refunded' | 'failed' | 'pending';
  amount: number;
  currency: string;
  captured: boolean;
  refund_status: string | null;
  error?: string;
} | null> {
  try {
    const razorpay = getRazorpayInstance(userType);
    const payment = await razorpay.payments.fetch(paymentId);
    
    return {
      status: payment.status as 'authorized' | 'captured' | 'refunded' | 'failed' | 'pending',
      amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount),
      currency: payment.currency as string,
      captured: payment.captured === true,
      refund_status: (payment.refund_status as string) || null,
    };
  } catch (error) {
    logError('Error fetching payment status from Razorpay', error as Error, {
      paymentId
    });
    return null;
  }
}

/**
 * Reconcile order payment status with Razorpay
 * Handles edge cases:
 * 1. Payment failed but money deducted (should refund)
 * 2. Payment succeeded but order not processed (should complete order)
 */
export async function reconcileOrderPayment(orderId: string): Promise<{
  success: boolean;
  action: 'no_action' | 'order_completed' | 'refund_initiated' | 'status_updated' | 'error';
  message: string;
  details?: Record<string, unknown>;
}> {
  try {
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return {
        success: false,
        action: 'error',
        message: 'Order not found'
      };
    }

    // If no payment ID, order is still pending - no reconciliation needed
    if (!order.paymentId && !order.razorpayOrderId) {
      return {
        success: true,
        action: 'no_action',
        message: 'Order has no payment ID - still pending'
      };
    }

    // Try to get payment status from Razorpay
    // Use order's userType to determine which Razorpay account to query
    let razorpayPaymentStatus = null;
    
    if (order.paymentId) {
      razorpayPaymentStatus = await verifyPaymentStatusWithRazorpay(order.paymentId, order.userType);
    }

    // Case 1: Order marked as failed but payment is actually captured
    if (order.paymentStatus === 'failed' && razorpayPaymentStatus?.status === 'captured') {
      logPaymentEvent('reconciliation_found_mismatch', {
        orderId: order.orderId,
        ourStatus: 'failed',
        razorpayStatus: 'captured',
        action: 'completing_order'
      });

      // Complete the order since payment was successful
      const completionResult = await processOrderCompletion(order);
      
      if (completionResult.success) {
        return {
          success: true,
          action: 'order_completed',
          message: 'Order was marked failed but payment succeeded. Order has been completed.',
          details: {
            previousStatus: order.paymentStatus,
            newStatus: 'paid',
            paymentId: order.paymentId
          }
        };
      } else {
        return {
          success: false,
          action: 'error',
          message: `Failed to complete order: ${completionResult.error}`
        };
      }
    }

    // Case 2: Order marked as paid but payment is actually failed/refunded
    if (order.paymentStatus === 'paid' && razorpayPaymentStatus) {
      if (razorpayPaymentStatus.status === 'failed' || razorpayPaymentStatus.status === 'refunded') {
        logPaymentEvent('reconciliation_found_mismatch', {
          orderId: order.orderId,
          ourStatus: 'paid',
          razorpayStatus: razorpayPaymentStatus.status,
          action: 'updating_status'
        });

        // Update order status to match Razorpay
        order.paymentStatus = razorpayPaymentStatus.status === 'refunded' ? 'refunded' : 'failed';
        order.status = 'cancelled';
        await order.save();

        return {
          success: true,
          action: 'status_updated',
          message: `Order status updated to match Razorpay: ${razorpayPaymentStatus.status}`,
          details: {
            previousStatus: 'paid',
            newStatus: order.paymentStatus,
            razorpayStatus: razorpayPaymentStatus.status
          }
        };
      }
    }

    // Case 3: Payment succeeded but order not fully processed
    if (order.paymentStatus === 'paid' && razorpayPaymentStatus?.status === 'captured') {
      // Check if order is missing critical data (certificate, wellwisher, etc.)
      const needsProcessing = !order.certificate || 
                              !order.assignedWellwisher || 
                              !order.wellwisherTasks || 
                              order.wellwisherTasks.length === 0;

      if (needsProcessing) {
        logPaymentEvent('reconciliation_order_incomplete', {
          orderId: order.orderId,
          missingCertificate: !order.certificate,
          missingWellwisher: !order.assignedWellwisher,
          missingTasks: !order.wellwisherTasks || order.wellwisherTasks.length === 0
        });

        // Retry order completion
        const completionResult = await processOrderCompletion(order);
        
        if (completionResult.success) {
          return {
            success: true,
            action: 'order_completed',
            message: 'Order payment succeeded but was incomplete. Order processing has been completed.',
            details: {
              whatWasFixed: {
                certificate: !order.certificate,
                wellwisher: !order.assignedWellwisher,
                tasks: !order.wellwisherTasks || order.wellwisherTasks.length === 0
              }
            }
          };
        } else {
          return {
            success: false,
            action: 'error',
            message: `Failed to complete order processing: ${completionResult.error}`
          };
        }
      }
    }

    // Case 4: Payment failed but money was deducted (authorized but not captured)
    if (order.paymentStatus === 'failed' && razorpayPaymentStatus?.status === 'authorized') {
      // Payment was authorized but not captured - should auto-refund
      // Note: Razorpay automatically refunds authorized payments after 5 minutes if not captured
      logPaymentEvent('reconciliation_payment_authorized_not_captured', {
        orderId: order.orderId,
        paymentId: order.paymentId,
        note: 'Razorpay will auto-refund authorized payments not captured within 5 minutes'
      });

      return {
        success: true,
        action: 'no_action',
        message: 'Payment was authorized but not captured. Razorpay will auto-refund if not captured within 5 minutes.'
      };
    }

    // Everything is in sync
    return {
      success: true,
      action: 'no_action',
      message: 'Order payment status is consistent with Razorpay'
    };

  } catch (error) {
    logError('Error reconciling order payment', error as Error, { orderId });
    return {
      success: false,
      action: 'error',
      message: `Reconciliation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Find and reconcile all orders with inconsistent payment states
 * Optimized for Vercel cron limits - processes in small batches
 */
export async function reconcileAllInconsistentOrders(limit: number = 20): Promise<{
  totalChecked: number;
  reconciled: number;
  errors: number;
  details: Array<{ orderId: string; action: string; message: string }>;
}> {
  const results = {
    totalChecked: 0,
    reconciled: 0,
    errors: 0,
    details: [] as Array<{ orderId: string; action: string; message: string }>
  };

  try {
    // Find orders that might have inconsistencies
    // 1. Paid orders without certificate/wellwisher (incomplete processing) - prioritize these
    // 2. Failed orders with payment IDs (might actually be paid) - check fewer to avoid API rate limits
    const incompletePaidOrders = await Order.find({
      paymentStatus: 'paid',
      $or: [
        { certificate: { $exists: false } },
        { assignedWellwisher: { $exists: false } },
        { 'wellwisherTasks.0': { $exists: false } }
      ]
    })
    .sort({ createdAt: -1 }) // Process newest first
    .limit(Math.floor(limit * 0.8)); // 80% of limit for incomplete orders

    const failedOrdersWithPayment = await Order.find({
      paymentStatus: 'failed',
      paymentId: { $exists: true, $ne: null },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Only check last 30 days
    })
    .sort({ createdAt: -1 })
    .limit(Math.floor(limit * 0.2)); // 20% of limit for failed orders (API calls are expensive)

    const inconsistentOrders = [...incompletePaidOrders, ...failedOrdersWithPayment];
    results.totalChecked = inconsistentOrders.length;

    // Process orders in parallel batches to speed up execution
    const batchSize = 5;
    for (let i = 0; i < inconsistentOrders.length; i += batchSize) {
      const batch = inconsistentOrders.slice(i, i + batchSize);
      
      // Process batch in parallel (but limit concurrency)
      const batchPromises = batch.map(async (order) => {
        try {
          // For incomplete paid orders, skip Razorpay API check (faster)
          if (order.paymentStatus === 'paid' && (!order.certificate || !order.assignedWellwisher)) {
            const { processOrderCompletion } = await import('@/lib/order-processing');
            const processingResult = await processOrderCompletion(order);
            
            if (processingResult.success && (processingResult.completed.certificate || processingResult.completed.wellwisher)) {
              results.reconciled++;
              results.details.push({
                orderId: order.orderId,
                action: 'order_completed',
                message: 'Order processing completed'
              });
            }
          } else {
            // For failed orders, do full reconciliation with Razorpay check
            const reconciliationResult = await reconcileOrderPayment(order.orderId);
            
            if (reconciliationResult.action !== 'no_action') {
              results.reconciled++;
              results.details.push({
                orderId: order.orderId,
                action: reconciliationResult.action,
                message: reconciliationResult.message
              });
            }
          }
        } catch (error) {
          results.errors++;
          logError('Error reconciling individual order', error as Error, {
            orderId: order.orderId
          });
        }
      });
      
      await Promise.all(batchPromises);
    }

    return results;
  } catch (error) {
    logError('Error in bulk reconciliation', error as Error);
    throw error;
  }
}

