import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Tree from '@/models/Tree';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { logPaymentEvent, logError } from '@/lib/logger';
import { createOrUpdateCustomerAccount } from '@/lib/customer-account';

// Lazy initialization of Razorpay to avoid module load errors
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

// Get the appropriate Razorpay Key ID
function getRazorpayKeyId(_userType?: 'individual' | 'company' | 'dealer' | 'hockey-india'): string {
  const companyKeyId = process.env.RAZORPAY_COMPANY_KEY_ID;
  if (companyKeyId) {
    return companyKeyId;
  }
  return process.env.RAZORPAY_KEY_ID!;
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

    // Check Razorpay credentials (will check user-specific credentials later based on userType)
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
    const { items, isGift, giftRecipientName, giftRecipientEmail, giftMessage, couponCode, couponDiscount, creditsUsed, finalAmount } = body;

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

    // Fetch tree details and validate (optimized with lean() for better performance)
    const treeIds = items.map((item: { treeId: string }) => item.treeId);
    
    // Validate treeIds are not empty
    if (treeIds.length === 0 || treeIds.some(id => !id || id.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Invalid tree IDs in order items' },
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
    
    const trees = await Tree.find({ _id: { $in: treeIds }, isActive: true })
      .select('_id name imageUrl price oxygenKgs co2 treeType packagePrice')
      .lean(); // Use lean() for faster queries - returns plain JS objects
    
    if (trees.length !== treeIds.length) {
      const foundTreeIds = trees.map(t => String(t._id));
      const missingTreeIds = treeIds.filter(id => !foundTreeIds.includes(id));
      logError('Some trees not found or inactive', new Error('Tree validation failed'), {
        requestedTreeIds: treeIds,
        foundTreeIds,
        missingTreeIds
      });
      
      return NextResponse.json(
        { success: false, error: `One or more trees not found or inactive. Please refresh the page and try again.` },
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
    const orderItems = items.map((item: { treeId: string; quantity: number; adoptionType?: string; recipientName?: string; recipientEmail?: string; giftMessage?: string; forestName?: string; occasion?: string; treeTypeOverride?: 'individual' | 'company' | 'forest'; customerName?: string; customerEmail?: string; customerPhone?: string; vehicleName?: string; customerProfilePicture?: string; }) => {
      const tree = trees.find(t => String(t._id) === item.treeId);
      if (!tree) {
        throw new Error(`Tree not found: ${item.treeId}`);
      }

      // Map 'dealer' treeType to 'individual' since Order model treeType enum doesn't include 'dealer'
      // Dealer trees are adopted for individual customers
      const resolvedTreeType = item.treeTypeOverride || tree.treeType || 'individual';
      const finalTreeType = resolvedTreeType === 'dealer' ? 'individual' : resolvedTreeType;

      const effectivePrice = ((finalTreeType === 'company' || finalTreeType === 'forest') &&
        tree.packagePrice !== undefined &&
        tree.packagePrice !== null &&
        tree.packagePrice > 0)
        ? tree.packagePrice
        : tree.price;

      return {
        treeId: String(tree._id),
        treeName: tree.name,
        treeImageUrl: tree.imageUrl,
        quantity: item.quantity,
        price: effectivePrice,
        oxygenKgs: tree.oxygenKgs,
        co2Kgs: (tree.co2 !== undefined && tree.co2 !== null) ? tree.co2 : undefined,
        treeType: finalTreeType,
        adoptionType: item.adoptionType || 'self',
        recipientName: item.recipientName,
        recipientEmail: item.recipientEmail,
        giftMessage: item.giftMessage,
        forestName: item.forestName,
        occasion: item.occasion,
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        customerPhone: item.customerPhone,
        vehicleName: item.vehicleName,
        customerProfilePicture: item.customerProfilePicture
      };
    });

    // Calculate total amount in paise (Razorpay requires amount in smallest currency unit)
    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    // Calculate amount after coupon discount (before credits)
    // If finalAmount is provided, calculate amountAfterCoupon by reversing the credits
    // Otherwise, calculate from totalAmount and couponDiscount
    const amountAfterCoupon = finalAmount !== undefined 
      ? (finalAmount + (creditsUsed || 0)) // Reverse credits to get amount after coupon
      : (totalAmount - (couponDiscount || 0)); // Calculate from total minus coupon discount
    
    // Fetch user from database to get correct name and credits
    const user = await User.findById(session.user.id).select('name companyName userType credits');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
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

    // Get correct userName based on userType
    const userName = (user.userType === 'company' || user.userType === 'dealer') 
      ? (user.companyName || user.name || 'User')
      : (user.name || 'User');

    // Validate and process credits usage
    // Dealers don't use credits - credits are given to customers instead
    let creditsToUse = 0;
    if (creditsUsed && creditsUsed > 0 && session.user.userType !== 'dealer') {

      const availableCredits = user.credits || 0;
      const maxCreditsUsage = Math.round(amountAfterCoupon * 0.25); // Max 25% of order
      
      // Validate credits usage
      if (creditsUsed > availableCredits) {
        return NextResponse.json(
          { success: false, error: `Insufficient Green Credits. Available: ${availableCredits} pts` },
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

      if (creditsUsed > maxCreditsUsage) {
        return NextResponse.json(
          { success: false, error: `Maximum Green Credits usage is 25% of order (${maxCreditsUsage} pts)` },
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

      creditsToUse = Math.min(creditsUsed, availableCredits, maxCreditsUsage);
      
      // Deduct credits from user
      user.credits = (user.credits || 0) - creditsToUse;
      await user.save();

      logPaymentEvent('credits_deducted', {
        userId: session.user.id,
        creditsDeducted: creditsToUse,
        newBalance: user.credits
      });
    }

    // Final amount after credits
    // If finalAmount was provided, use it directly (it already includes credits)
    // Otherwise, calculate it from amountAfterCoupon - creditsToUse
    const orderTotalAmount = finalAmount !== undefined 
      ? finalAmount 
      : (amountAfterCoupon - creditsToUse);
    const amountInPaise = Math.round(orderTotalAmount * 100); // Convert to paise

    // Check for duplicate pending orders (within last 5 minutes) with same items
    // This prevents multiple orders from being created if user clicks payment button multiple times
    // Optimized: Use lean() and limit to 1 for faster query
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingPendingOrder = await Order.findOne({
      userId: session.user.id,
      paymentStatus: 'pending',
      status: 'pending',
      totalAmount: totalAmount,
      createdAt: { $gte: fiveMinutesAgo },
      'items.0.treeId': orderItems[0]?.treeId, // Check first item matches
      'items.0.quantity': orderItems[0]?.quantity
    })
      .select('orderId razorpayOrderId paymentId items')
      .sort({ createdAt: -1 })
      .lean()
      .limit(1);

    // If duplicate order found, return existing one instead of creating new
    if (existingPendingOrder) {
      // Verify items match exactly
      const itemsMatch = existingPendingOrder.items.length === orderItems.length &&
        existingPendingOrder.items.every((existingItem: { treeId: string; quantity: number; adoptionType?: string }, idx: number) => {
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
        // Note: existingPendingOrder is a lean object, so we need to fetch the full document to update
        let razorpayOrderId = (existingPendingOrder as { paymentId?: string; razorpayOrderId?: string }).razorpayOrderId || 
                              (existingPendingOrder as { paymentId?: string; razorpayOrderId?: string }).paymentId;
        
        if (!razorpayOrderId) {
          // Create Razorpay order for existing order
          const razorpay = getRazorpayInstance(user.userType);
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
          
          // Update order with Razorpay order ID (fetch full document to update)
          await Order.updateOne(
            { orderId: existingPendingOrder.orderId },
            { razorpayOrderId: razorpayOrderId }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            razorpayOrderId,
            orderId: existingPendingOrder.orderId,
            amount: amountInPaise,
            currency: 'INR',
            razorpayKeyId: getRazorpayKeyId(user.userType)
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

    // For dealer orders, create/update customer accounts
    let customerUserId: string | undefined;
    if (session.user.userType === 'dealer') {
      console.log('[PAYMENT_CREATE] Processing dealer order', {
        dealerId: session.user.id,
        orderItemsCount: orderItems.length,
        firstItem: orderItems[0] ? {
          hasCustomerName: !!orderItems[0].customerName,
          hasCustomerEmail: !!orderItems[0].customerEmail,
          customerName: orderItems[0].customerName,
          customerEmail: orderItems[0].customerEmail
        } : 'no items'
      });
      
      // Get customer info from first item (all items should have same customer for dealer orders)
      if (orderItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No items in order' },
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
      
      const firstItem = orderItems[0];
      // Validate customer info - check for empty strings and whitespace
      const customerName = firstItem.customerName?.trim();
      const customerEmail = firstItem.customerEmail?.trim();
      
      if (!customerName || customerName === '') {
        logError('Missing customer name in dealer order', new Error('Customer name required'), {
          dealerId: session.user.id,
          orderItemsCount: orderItems.length
        });
        return NextResponse.json(
          { success: false, error: 'Customer name is required for dealer orders. Please add customer information to your cart items.' },
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
      
      if (!customerEmail || customerEmail === '') {
        logError('Missing customer email in dealer order', new Error('Customer email required'), {
          dealerId: session.user.id,
          customerName: customerName
        });
        return NextResponse.json(
          { success: false, error: 'Customer email is required for dealer orders. Please add customer information to your cart items.' },
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
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid customer email address.' },
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
      
      try {
        // Automatically create or update customer account for dealer orders
        // This is mandatory - customer account must exist for certificates and QR codes
        customerUserId = await createOrUpdateCustomerAccount(
          customerName,
          customerEmail,
          firstItem.customerProfilePicture,
          firstItem.customerPhone
        );
        logPaymentEvent('customer_account_created_or_updated', {
          customerEmail: customerEmail,
          customerUserId,
          dealerId: session.user.id,
          accountCreated: true
        });
        console.log(`[PAYMENT_CREATE] Successfully created/updated customer account for ${customerEmail}. Customer ID: ${customerUserId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError('Failed to create/update customer account', error instanceof Error ? error : new Error(String(error)), {
          customerEmail: customerEmail,
          dealerId: session.user.id,
          errorMessage
        });
        
        // Try to recover by using existing customer account if it exists
        try {
          const existingUser = await User.findOne({ email: customerEmail.toLowerCase() });
          if (existingUser) {
            customerUserId = String(existingUser._id);
            logPaymentEvent('using_existing_customer_account_after_error', {
              customerEmail: customerEmail,
              customerUserId,
              dealerId: session.user.id
            });
            console.log(`[PAYMENT_CREATE] Using existing customer account for ${customerEmail}. Customer ID: ${customerUserId}`);
          } else {
            // Account creation is mandatory for dealer orders
            // Customer account is required for certificates and QR codes
            // If we can't create it, we should fail the order creation
            logError('Customer account creation failed and no existing account found', error instanceof Error ? error : new Error(String(error)), {
              customerEmail: customerEmail,
              dealerId: session.user.id,
              errorMessage
            });
            return NextResponse.json(
              { 
                success: false, 
                error: `Failed to create customer account. Please try again. If the problem persists, contact support. Error: ${errorMessage}` 
              },
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
        } catch (lookupError) {
          // If lookup also fails, we cannot proceed without a customer account
          logError('Failed to lookup existing customer account and account creation failed', lookupError instanceof Error ? lookupError : new Error(String(lookupError)), {
            customerEmail: customerEmail,
            dealerId: session.user.id,
            originalError: errorMessage
          });
          return NextResponse.json(
            { 
              success: false, 
              error: `Failed to create or find customer account. Please try again. If the problem persists, contact support.` 
            },
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
      
      // Ensure customerUserId is set before proceeding
      if (!customerUserId) {
        logError('Customer account ID is missing after creation attempt', new Error('customerUserId is undefined'), {
          customerEmail: customerEmail,
          dealerId: session.user.id
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create customer account. Please try again.' 
          },
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

    // Create a placeholder order in database first (status: pending)
    const firstThreeLetters = userName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    const fiveNumbers = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const orderId = `${firstThreeLetters}${fiveNumbers}`;
    
    const order = new Order({
      orderId,
      userId: String(session.user.id), // Ensure userId is stored as string
      userEmail: session.user.email,
      userName: userName,
      userType: session.user.userType,
      customerUserId: customerUserId ? String(customerUserId) : undefined, // Link to customer account for dealer orders (ensure string format)
      items: orderItems,
      totalAmount,
      couponCode: couponCode || undefined,
      couponDiscount: couponDiscount || undefined,
      creditsUsed: creditsToUse || undefined,
      finalAmount: orderTotalAmount,
      isGift,
      giftRecipientName,
      giftRecipientEmail,
      giftMessage,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay'
    });

    await order.save();
    
    // Verify customerUserId was saved correctly for dealer orders
    if (session.user.userType === 'dealer' && customerUserId) {
      const savedOrder = await Order.findById(order._id).select('customerUserId').lean();
      console.log('[PAYMENT_CREATE] Verified order saved with customerUserId:', {
        orderId: order.orderId,
        customerUserId: savedOrder?.customerUserId,
        customerUserIdType: typeof savedOrder?.customerUserId,
        expectedCustomerUserId: String(customerUserId)
      });
      
      if (!savedOrder?.customerUserId || String(savedOrder.customerUserId) !== String(customerUserId)) {
        console.error('[PAYMENT_CREATE] WARNING: customerUserId mismatch in saved order!', {
          orderId: order.orderId,
          saved: savedOrder?.customerUserId,
          expected: String(customerUserId)
        });
      }
    }

    // Create Razorpay order
    logPaymentEvent('razorpay_order_creation_started', { 
      orderId, 
      amount: amountInPaise,
      userId: session.user.id,
      userType: user.userType
    });
    
    const razorpay = getRazorpayInstance(user.userType);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        itemsCount: orderItems.length,
        userType: user.userType
      }
    });

    logPaymentEvent('razorpay_order_created', { 
      orderId, 
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      userType: user.userType
    });

    // Store Razorpay order ID in the order
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return NextResponse.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        orderId,
        amount: amountInPaise,
        currency: 'INR',
        razorpayKeyId: getRazorpayKeyId(user.userType)
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (_error) {
    const error = _error as Error;
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack;
    
    logError('Error creating payment order', error, {
      errorMessage,
      errorStack: errorStack?.substring(0, 500) // Limit stack trace length
    });
    
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
      
      // Return Razorpay error details
      return NextResponse.json(
        { success: false, error: razorpayError.error?.description || 'Razorpay payment gateway error' },
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
    
    // Return more detailed error message for debugging
    const userFriendlyMessage = errorMessage.includes('Tree not found') 
      ? 'One or more trees are no longer available. Please refresh and try again.'
      : errorMessage.includes('customer account')
      ? errorMessage
      : errorMessage.includes('Customer name and email')
      ? errorMessage
      : errorMessage.includes('No items')
      ? errorMessage
      : 'Failed to create payment order. Please try again or contact support if the problem persists.';
    
    return NextResponse.json(
      { success: false, error: userFriendlyMessage },
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

