import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { logPaymentEvent, logError } from '@/lib/logger';

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

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logError('Invalid webhook signature', new Error('Signature mismatch'));
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
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

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      
      default:
        logPaymentEvent('webhook_unhandled_event', { event: event.event });
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

async function handlePaymentCaptured(payment: { id: string; [key: string]: unknown }) {
  try {
    const order = await Order.findOne({ 
      'paymentId': payment.id 
    });

    if (!order) {
      logError('Order not found for payment', new Error(`Payment ID: ${payment.id}`));
      return;
    }

    if (order.paymentStatus === 'paid') {
      logPaymentEvent('payment_already_processed', { 
        orderId: order.orderId,
        paymentId: payment.id 
      });
      return;
    }

    // Update order status
    order.paymentStatus = 'paid';
    order.status = 'confirmed';

    // Create wellwisher tasks
    const wellwisher = await User.findOne({ role: 'wellwisher' });
    
    if (wellwisher) {
      const wellwisherTasks = order.items.map((item: { treeName: string; quantity: number; [key: string]: unknown }, index: number) => ({
        taskId: `${order.orderId}-${index}`,
        task: `Plant and care for ${item.treeName}`,
        description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
        scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        priority: 'medium' as const,
        status: 'pending' as const,
        location: 'To be determined'
      }));

      order.assignedWellwisher = wellwisher._id.toString();
      order.wellwisherTasks = wellwisherTasks;
    }

    await order.save();
    logPaymentEvent('payment_captured_webhook_processed', { 
      orderId: order.orderId,
      paymentId: payment.id 
    });

  } catch (_error) {
    logError('Error handling payment captured webhook', _error as Error);
  }
}

async function handlePaymentFailed(payment: { id: string; [key: string]: unknown }) {
  try {
    const order = await Order.findOne({ 
      'paymentId': payment.id 
    });

    if (!order) {
      logError('Order not found for failed payment', new Error(`Payment ID: ${payment.id}`));
      return;
    }

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
