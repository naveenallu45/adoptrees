import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';
import { generateCertificate } from '@/lib/certificate';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

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
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
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
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
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
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
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
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Check if order already processed
    if (order.paymentStatus === 'paid') {
      // Generate certificate if it doesn't exist
      if (!order.certificate) {
        try {
          const user = await User.findById(order.userId).select('publicId qrCode');
          if (user && user.publicId) {
            const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);
            
            const certificateBuffer = await generateCertificate({
              userName: order.userName,
              profilePicUrl: undefined,
              treesCount,
              oxygenKgs,
              publicId: user.publicId,
              orderId: order.orderId,
              qrCode: user.qrCode, // Use stored QR code from user
            });
            
            order.certificate = certificateBuffer;
            await order.save();
          }
        } catch (certError) {
          logError('Error generating certificate for existing order', certError as Error);
        }
      }
      
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
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Update order with payment details
    order.paymentStatus = 'paid';
    order.paymentId = razorpay_payment_id;
    order.status = 'confirmed';

    // Create wellwisher tasks for all orders - assign using equal distribution
    // Only assign if not already assigned
    if (!order.assignedWellwisher || !order.wellwisherTasks || order.wellwisherTasks.length === 0) {
      const { assignWellWisherEqually } = await import('@/lib/utils/wellwisher-assignment');
      const wellwisherId = await assignWellWisherEqually();
      
      if (wellwisherId) {
        const wellwisherTasks = order.items.map((item, index) => ({
          taskId: `${order.orderId}-${index}`,
          task: `Plant and care for ${item.treeName}`,
          description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${order.isGift && order.giftMessage ? `Gift message: ${order.giftMessage}` : ''}`,
          scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
          priority: 'medium' as const,
          status: 'pending' as const,
          location: 'To be determined'
        }));

        order.assignedWellwisher = wellwisherId;
        order.wellwisherTasks = wellwisherTasks;
      }
    }

    // Generate and store certificate
    try {
      // Get user details including publicId and qrCode
      const user = await User.findById(order.userId).select('publicId qrCode');
      if (!user || !user.publicId) {
        throw new Error('User publicId not found');
      }

      // Calculate total trees count and oxygen for this order
      const treesCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const oxygenKgs = order.items.reduce((sum, item) => sum + (item.oxygenKgs * item.quantity), 0);

      // Generate certificate
      const certificateBuffer = await generateCertificate({
        userName: order.userName,
        profilePicUrl: undefined, // Profile pic can be added later if available
        treesCount,
        oxygenKgs,
        publicId: user.publicId,
        orderId: order.orderId,
        qrCode: user.qrCode, // Use stored QR code from user
      });

      // Store certificate in order
      order.certificate = certificateBuffer;
    } catch (certError) {
      // Log error but don't fail the payment verification
      logError('Error generating certificate', certError as Error);
      // Continue with order save even if certificate generation fails
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
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (_error) {
    logError('Error verifying payment', _error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

