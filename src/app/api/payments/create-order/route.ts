import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Tree from '@/models/Tree';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';

// Lazy initialization of Razorpay to avoid module load errors
function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
    // Rate limiting for payment creation
    const rateLimitResult = await checkRateLimit(request, {
      maxRequests: 10, // 10 payment attempts per minute
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    logPaymentEvent('payment_order_creation_started', {});
    
    const session = await auth();
    
    if (!session?.user) {
      logPaymentEvent('payment_order_creation_failed', { reason: 'authentication_required' });
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

    // Check Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      logError('Razorpay credentials missing', new Error('Missing credentials'));
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error' },
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

    await connectDB();

    const body = await request.json();
    const { items, isGift, giftRecipientName, giftRecipientEmail, giftMessage } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required' },
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

    // Validate gift fields if it's a gift
    if (isGift && (!giftRecipientName || !giftRecipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'Gift recipient name and email are required for gift orders' },
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

    // Fetch tree details and validate
    const treeIds = items.map((item: { treeId: string }) => item.treeId);
    const trees = await Tree.find({ _id: { $in: treeIds }, isActive: true });
    
    if (trees.length !== treeIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more trees not found or inactive' },
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

    // Create order items with tree details
    const orderItems = items.map((item: { treeId: string; quantity: number; adoptionType?: string; recipientName?: string; recipientEmail?: string; giftMessage?: string }) => {
      const tree = trees.find(t => String(t._id) === item.treeId);
      if (!tree) {
        throw new Error(`Tree not found: ${item.treeId}`);
      }

      return {
        treeId: String(tree._id),
        treeName: tree.name,
        treeImageUrl: tree.imageUrl,
        quantity: item.quantity,
        price: tree.price,
        oxygenKgs: tree.oxygenKgs,
        adoptionType: item.adoptionType || 'self',
        recipientName: item.recipientName,
        recipientEmail: item.recipientEmail,
        giftMessage: item.giftMessage
      };
    });

    // Calculate total amount in paise (Razorpay requires amount in smallest currency unit)
    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const amountInPaise = Math.round(totalAmount * 100); // Convert to paise

    // Check for duplicate pending orders (within last 5 minutes) with same items
    // This prevents multiple orders from being created if user clicks payment button multiple times
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingPendingOrder = await Order.findOne({
      userId: session.user.id,
      paymentStatus: 'pending',
      status: 'pending',
      totalAmount: totalAmount,
      createdAt: { $gte: fiveMinutesAgo },
      'items.0.treeId': orderItems[0]?.treeId, // Check first item matches
      'items.0.quantity': orderItems[0]?.quantity
    }).sort({ createdAt: -1 });

    // If duplicate order found, return existing one instead of creating new
    if (existingPendingOrder) {
      // Verify items match exactly
      const itemsMatch = existingPendingOrder.items.length === orderItems.length &&
        existingPendingOrder.items.every((existingItem, idx) => {
          const newItem = orderItems[idx];
          return existingItem.treeId === newItem.treeId &&
                 existingItem.quantity === newItem.quantity &&
                 existingItem.adoptionType === newItem.adoptionType;
        });

      if (itemsMatch) {
        logPaymentEvent('duplicate_order_prevented', { 
          existingOrderId: existingPendingOrder.orderId,
          userId: session.user.id 
        });
        
        // Get or create Razorpay order for existing order
        let razorpayOrderId = existingPendingOrder.paymentId; // If already has one
        
        if (!razorpayOrderId) {
          // Create Razorpay order for existing order
          const razorpay = getRazorpayInstance();
          const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: existingPendingOrder.orderId,
            notes: {
              orderId: existingPendingOrder.orderId,
              userId: session.user.id,
              userEmail: session.user.email || '',
              itemsCount: orderItems.length
            }
          });
          razorpayOrderId = razorpayOrder.id;
          
          // Update order with Razorpay order ID
          existingPendingOrder.paymentId = razorpayOrderId;
          await existingPendingOrder.save();
        }

        return NextResponse.json({
          success: true,
          data: {
            razorpayOrderId,
            orderId: existingPendingOrder.orderId,
            amount: amountInPaise,
            currency: 'INR',
            razorpayKeyId: process.env.RAZORPAY_KEY_ID!
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
    }

    // Create a placeholder order in database first (status: pending)
    const userName = session.user.name || 'User';
    const firstThreeLetters = userName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    const fiveNumbers = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const orderId = `${firstThreeLetters}${fiveNumbers}`;
    
    const order = new Order({
      orderId,
      userId: String(session.user.id), // Ensure userId is stored as string
      userEmail: session.user.email,
      userName: session.user.name || 'User',
      userType: session.user.userType,
      items: orderItems,
      totalAmount,
      isGift,
      giftRecipientName,
      giftRecipientEmail,
      giftMessage,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay'
    });

    await order.save();

    // Create Razorpay order
    logPaymentEvent('razorpay_order_creation_started', { 
      orderId, 
      amount: amountInPaise,
      userId: session.user.id 
    });
    
    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        itemsCount: orderItems.length
      }
    });

    logPaymentEvent('razorpay_order_created', { 
      orderId, 
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise 
    });

    return NextResponse.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        orderId,
        amount: amountInPaise,
        currency: 'INR',
        razorpayKeyId: process.env.RAZORPAY_KEY_ID!
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (_error) {
    logError('Error creating payment order', _error as Error);
    
    // Check if it's a Razorpay specific error
    if (_error && typeof _error === 'object' && 'statusCode' in _error) {
      const razorpayError = _error as { statusCode: number; error?: { description?: string; code?: string } };
      logError('Razorpay API error', new Error(razorpayError.error?.description || 'Unknown Razorpay error'), {
        statusCode: razorpayError.statusCode,
        errorCode: razorpayError.error?.code
      });
      
      if (razorpayError.statusCode === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid Razorpay credentials. Please check your API keys.' },
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
    
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
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

