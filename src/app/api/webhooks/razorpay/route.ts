import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { logPaymentEvent, logError } from '@/lib/logger';
import { processOrderCompletion } from '@/lib/order-processing';
import { verifyPaymentStatusWithRazorpay } from '@/lib/payment-reconciliation';

// Store processed webhook IDs to prevent duplicate processing
const processedWebhooks = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookId = request.headers.get('x-razorpay-webhook-id');
    
    if (!signature) {
      logError('Missing Razorpay webhook signature', new Error('No signature provided'));
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Check for duplicate webhook processing
    if (webhookId && processedWebhooks.has(webhookId)) {
      logPaymentEvent('webhook_duplicate_ignored', { webhookId });
      return NextResponse.json({ received: true, status: 'duplicate' });
    }

    // PRODUCTION: Validate webhook secret is configured
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logError('Razorpay webhook secret not configured', new Error('RAZORPAY_WEBHOOK_SECRET is missing'));
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logError('Invalid webhook signature', new Error('Signature mismatch'), {
        webhookId: webhookId || 'unknown',
        signatureLength: signature.length,
        expectedLength: expectedSignature.length
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook event body
    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      logError('Invalid webhook JSON body', parseError as Error, { webhookId: webhookId || 'unknown' });
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate event structure
    if (!event || !event.event) {
      logError('Invalid webhook event structure', new Error('Missing event field'), { 
        webhookId: webhookId || 'unknown',
        body: body.substring(0, 200) // Log first 200 chars for debugging
      });
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }

    logPaymentEvent('webhook_received', { 
      event: event.event,
      webhookId: webhookId || 'unknown'
    });

    // Mark webhook as processed
    if (webhookId) {
      processedWebhooks.add(webhookId);
      // Clean up old webhook IDs (keep last 1000)
      if (processedWebhooks.size > 1000) {
        const oldIds = Array.from(processedWebhooks).slice(0, 100);
        oldIds.forEach(id => processedWebhooks.delete(id));
      }
    }

    await connectDB();

    // Validate payload structure before processing
    if (!event.payload) {
      logError('Webhook missing payload', new Error('No payload in event'), { 
        event: event.event,
        webhookId: webhookId || 'unknown'
      });
      return NextResponse.json(
        { error: 'Invalid event payload' },
        { status: 400 }
      );
    }

    switch (event.event) {
      case 'payment.captured':
        if (!event.payload.payment || !event.payload.payment.entity) {
          logError('Invalid payment.captured payload', new Error('Missing payment entity'), { webhookId });
          return NextResponse.json(
            { error: 'Invalid payload structure' },
            { status: 400 }
          );
        }
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        if (!event.payload.payment || !event.payload.payment.entity) {
          logError('Invalid payment.failed payload', new Error('Missing payment entity'), { webhookId });
          return NextResponse.json(
            { error: 'Invalid payload structure' },
            { status: 400 }
          );
        }
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case 'order.paid':
        if (!event.payload.order || !event.payload.order.entity) {
          logError('Invalid order.paid payload', new Error('Missing order entity'), { webhookId });
          return NextResponse.json(
            { error: 'Invalid payload structure' },
            { status: 400 }
          );
        }
        await handleOrderPaid(event.payload.order.entity);
        break;
      
      default:
        logPaymentEvent('webhook_unhandled_event', { 
          event: event.event,
          webhookId: webhookId || 'unknown'
        });
    }

    return NextResponse.json({ received: true });

  } catch (_error) {
    logError('Webhook processing error', _error as Error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: { id: string; order_id?: string; [key: string]: unknown }) {
  try {
    // Try to find order by Razorpay order ID first (most reliable)
    // The payment entity contains order_id which is the Razorpay order ID
    let order = null;
    
    if (payment.order_id) {
      order = await Order.findOne({ 
        razorpayOrderId: payment.order_id 
      });
    }
    
    // Fallback: try to find by payment ID (in case paymentId was already set)
    if (!order && payment.id) {
      order = await Order.findOne({ 
        paymentId: payment.id 
      });
    }

    if (!order) {
      logError('Order not found for payment', new Error(`Payment ID: ${payment.id}, Order ID: ${payment.order_id || 'unknown'}`));
      return;
    }

    if (order.paymentStatus === 'paid') {
      logPaymentEvent('payment_already_processed', { 
        orderId: order.orderId,
        paymentId: payment.id 
      });
      return;
    }

    // Update order with payment details (transaction-safe)
    order.paymentStatus = 'paid';
    order.paymentId = payment.id; // Store Razorpay payment ID
    order.status = 'confirmed';
    await order.save();

    logPaymentEvent('payment_captured_webhook_processed', { 
      orderId: order.orderId,
      paymentId: payment.id 
    });

    // PRODUCTION-SAFE: Use centralized order processing function
    // This is idempotent and handles all edge cases
    try {
      const processingResult = await processOrderCompletion(order);
      
      if (!processingResult.success) {
        logError('Order processing failed in webhook', new Error(processingResult.error || 'Unknown error'), {
          orderId: order.orderId,
          paymentId: payment.id
        });
        // Don't throw - order is already marked as paid, processing can be retried
      } else {
        logPaymentEvent('order_processing_completed_via_webhook', {
          orderId: order.orderId,
          completed: processingResult.completed
        });
      }
    } catch (processingError) {
      logError('Error in order processing', processingError as Error, {
        orderId: order.orderId,
        paymentId: payment.id
      });
      // Order is already marked as paid - reconciliation cron will retry
    }

  } catch (_error) {
    logError('Error handling payment captured webhook', _error as Error);
  }
}

async function handlePaymentFailed(payment: { id: string; order_id?: string; [key: string]: unknown }) {
  try {
    // Try to find order by Razorpay order ID first
    let order = null;
    
    if (payment.order_id) {
      order = await Order.findOne({ 
        razorpayOrderId: payment.order_id 
      });
    }
    
    // Fallback: try to find by payment ID
    if (!order && payment.id) {
      order = await Order.findOne({ 
        paymentId: payment.id 
      });
    }

    if (!order) {
      logError('Order not found for failed payment', new Error(`Payment ID: ${payment.id}, Order ID: ${payment.order_id || 'unknown'}`));
      return;
    }

    // PRODUCTION-SAFE: Verify payment status with Razorpay before marking as failed
    // Edge case: Payment might be marked as failed but money was actually deducted
    if (payment.id) {
      const razorpayStatus = await verifyPaymentStatusWithRazorpay(payment.id);
      
      if (razorpayStatus) {
        // If payment is actually captured, don't mark as failed
        if (razorpayStatus.status === 'captured' && razorpayStatus.captured) {
          logPaymentEvent('payment_failed_webhook_but_payment_captured', {
            orderId: order.orderId,
            paymentId: payment.id,
            razorpayStatus: razorpayStatus.status,
            action: 'completing_order_instead'
          });
          
          // Complete the order since payment was successful
          order.paymentStatus = 'paid';
          order.paymentId = payment.id;
          order.status = 'confirmed';
          await order.save();
          
          // Process order completion
          await processOrderCompletion(order);
          return;
        }
        
        // If payment is authorized but not captured, it will auto-refund
        if (razorpayStatus.status === 'authorized') {
          logPaymentEvent('payment_authorized_not_captured', {
            orderId: order.orderId,
            paymentId: payment.id,
            note: 'Payment authorized but not captured - Razorpay will auto-refund'
          });
        }
      }
    }

    // Mark as failed only if payment is truly failed
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    await order.save();
    
    logPaymentEvent('payment_failed_webhook_processed', { 
      orderId: order.orderId,
      paymentId: payment.id 
    });

  } catch (_error) {
    logError('Error handling payment failed webhook', _error as Error);
  }
}

async function handleOrderPaid(order: { receipt: string; [key: string]: unknown }) {
  try {
    const dbOrder = await Order.findOne({ 
      orderId: order.receipt 
    });

    if (!dbOrder) {
      logError('Order not found for paid order', new Error(`Receipt: ${order.receipt}`));
      return;
    }

    if (dbOrder.paymentStatus === 'paid') {
      logPaymentEvent('order_already_marked_paid', { 
        orderId: dbOrder.orderId,
        receipt: order.receipt 
      });
      return;
    }

    dbOrder.paymentStatus = 'paid';
    dbOrder.status = 'confirmed';
    await dbOrder.save();
    
    logPaymentEvent('order_paid_webhook_processed', { 
      orderId: dbOrder.orderId,
      receipt: order.receipt 
    });

  } catch (_error) {
    logError('Error handling order paid webhook', _error as Error);
  }
}
