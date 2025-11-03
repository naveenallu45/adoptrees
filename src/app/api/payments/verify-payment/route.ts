import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for payment verification
    const rateLimitResult = await checkRateLimit(request, {
      maxRequests: 20, // 20 verification attempts per minute
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const session = await auth();
    
    if (!session?.user) {
      logPaymentEvent('payment_verification_failed', { reason: 'authentication_required' });
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logPaymentEvent('payment_verification_failed', { reason: 'missing_verification_data' });
      return NextResponse.json(
        { success: false, error: 'Payment verification data is required' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logPaymentEvent('payment_verification_failed', { 
        reason: 'signature_mismatch',
        orderId,
        razorpay_order_id,
        razorpay_payment_id
      });
      
      // Payment verification failed
      if (orderId) {
        const order = await Order.findOne({ orderId });
        if (order && order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed';
          await order.save();
        }
      }

      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await Order.findOne({ orderId });

    if (!order) {
      logPaymentEvent('payment_verification_failed', { 
        reason: 'order_not_found',
        orderId 
      });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order already processed
    if (order.paymentStatus === 'paid') {
      logPaymentEvent('payment_verification_already_processed', { 
        orderId,
        paymentStatus: order.paymentStatus 
      });
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        data: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount
        }
      });
    }

    // Update order with payment details
    order.paymentStatus = 'paid';
    order.paymentId = razorpay_payment_id;
    order.status = 'confirmed';

    // Create wellwisher tasks for all orders
    const wellwisher = await User.findOne({ role: 'wellwisher' });
    
    if (wellwisher) {
      const wellwisherTasks = order.items.map((item, index) => ({
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

    logPaymentEvent('payment_verification_successful', {
      orderId: order.orderId,
      paymentId: razorpay_payment_id,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        items: order.items.length
      }
    });

  } catch (_error) {
    logError('Error verifying payment', _error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

