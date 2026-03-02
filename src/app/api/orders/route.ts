import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { IOrder } from '@/models/Order';
import Tree from '@/models/Tree';
import User from '@/models/User';
import { auth } from '@/lib/auth-server';
import { sendWellWisherTaskAssignmentEmail } from '@/lib/email';
import { logPaymentEvent } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { items, isGift, giftRecipientName, giftRecipientEmail, giftMessage, couponCode, couponDiscount, creditsUsed, finalAmount } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required' },
        { status: 400 }
      );
    }

    // Validate gift fields if it's a gift
    if (isGift && (!giftRecipientName || !giftRecipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'Gift recipient name and email are required for gift orders' },
        { status: 400 }
      );
    }

    // Fetch tree details and validate
    const treeIds = items.map((item: { treeId: string }) => item.treeId);
    const trees = await Tree.find({ _id: { $in: treeIds }, isActive: true });
    
    if (trees.length !== treeIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more trees not found or inactive' },
        { status: 400 }
      );
    }

    // Create order items with tree details
    const orderItems = items.map((item: { treeId: string; quantity: number; adoptionType?: string; recipientName?: string; recipientEmail?: string; giftMessage?: string; forestName?: string; occasion?: string; treeTypeOverride?: 'individual' | 'company' | 'forest'; }) => {
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
        co2Kgs: (tree.co2 !== undefined && tree.co2 !== null) ? tree.co2 : undefined,
        treeType: item.treeTypeOverride || tree.treeType || 'individual',
        adoptionType: item.adoptionType || 'self',
        recipientName: item.recipientName,
        recipientEmail: item.recipientEmail,
        giftMessage: item.giftMessage,
        forestName: item.forestName,
        occasion: item.occasion
      };
    });

    // Calculate total amount (subtotal before coupon)
    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    // Calculate amount after coupon discount
    const amountAfterCoupon = finalAmount !== undefined ? finalAmount : totalAmount;
    
    // Validate and process credits usage
    // Dealers don't use credits - credits are given to customers instead
    let creditsToUse = 0;
    if (creditsUsed && creditsUsed > 0 && session.user.userType !== 'dealer') {
      // Fetch user to check available credits
      const user = await User.findById(session.user.id);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const availableCredits = user.credits || 0;
      const maxCreditsUsage = Math.round(amountAfterCoupon * 0.25); // Max 25% of order
      
      // Validate credits usage
      if (creditsUsed > availableCredits) {
        return NextResponse.json(
          { success: false, error: `Insufficient Green Credits. Available: ${availableCredits} pts` },
          { status: 400 }
        );
      }

      if (creditsUsed > maxCreditsUsage) {
        return NextResponse.json(
          { success: false, error: `Maximum Green Credits usage is 25% of order (${maxCreditsUsage} pts)` },
          { status: 400 }
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
    const orderTotalAmount = amountAfterCoupon - creditsToUse;

    // Check for duplicate pending orders with same items before creating
    // Get all pending orders for this user
    const pendingOrders = await Order.find({
      userId: String(session.user.id),
      status: 'pending',
      paymentStatus: 'pending',
      totalAmount: totalAmount,
      isGift: isGift || false
    }).sort({ createdAt: -1 });

    // Check if any pending order has the same items
    for (const existingOrder of pendingOrders) {
      if (existingOrder.items.length !== orderItems.length) {
        continue;
      }

      // Sort items for comparison
      const existingItems = existingOrder.items.map(item => ({
        treeId: String(item.treeId),
        quantity: item.quantity,
        adoptionType: item.adoptionType || 'self'
      })).sort((a, b) => a.treeId.localeCompare(b.treeId));

      const newItems = orderItems.map(item => ({
        treeId: String(item.treeId),
        quantity: item.quantity,
        adoptionType: item.adoptionType || 'self'
      })).sort((a, b) => a.treeId.localeCompare(b.treeId));

      // Compare items
      const itemsMatch = existingItems.every((existingItem, index) => {
        const newItem = newItems[index];
        return existingItem.treeId === newItem.treeId &&
               existingItem.quantity === newItem.quantity &&
               existingItem.adoptionType === newItem.adoptionType;
      });

      if (itemsMatch) {
        // Duplicate found - return existing order
        return NextResponse.json({
          success: true,
          data: {
            orderId: existingOrder.orderId,
            message: 'Order already exists. Using existing order.',
            totalAmount,
            items: orderItems.length,
            isDuplicate: true
          }
        });
      }
    }

    // Create order with user-based ID
    const userName = session.user.name || 'User';
    const firstThreeLetters = userName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    
    // Ensure unique orderId by checking database
    let orderId: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const fiveNumbers = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      orderId = `${firstThreeLetters}${fiveNumbers}`;
      
      const existingOrder = await Order.findOne({ orderId });
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      // Fallback: use timestamp-based ID if random generation fails
      const timestamp = Date.now().toString().slice(-8);
      orderId = `${firstThreeLetters}${timestamp}`;
    }
    
    const order = new Order({
      orderId: orderId!,
      userId: String(session.user.id), // Ensure userId is stored as string
      userEmail: session.user.email,
      userName: session.user.name || 'User',
      userType: session.user.userType,
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
      paymentStatus: 'pending'
    });

    await order.save();

    // Create wellwisher tasks for all orders (not just gifts)
    // Assign to well-wisher using equal distribution
    const { assignWellWisherEqually } = await import('@/lib/utils/wellwisher-assignment');
    const wellwisherId = await assignWellWisherEqually();
    
    if (wellwisherId) {
      console.log(`[ORDER_CREATE] Assigning well-wisher ${wellwisherId} to order ${order.orderId}`);
      // Create one task per tree (not per item) so well-wisher can upload separate images/locations for each tree
      const wellwisherTasks: Array<{
        taskId: string;
        task: string;
        description: string;
        scheduledDate: Date;
        status: 'pending';
        location: string;
      }> = [];
      let taskIndex = 0;
      orderItems.forEach((item) => {
        // Create a separate task for each tree in the quantity
        for (let i = 0; i < item.quantity; i++) {
          wellwisherTasks.push({
            taskId: `${order.orderId}-${taskIndex}`,
            task: `Plant and care for ${item.treeName}`,
            description: `Plant 1 ${item.treeName} tree and provide ongoing care. ${isGift && giftMessage ? `Gift message: ${giftMessage}` : ''}`,
            scheduledDate: new Date(Date.now() + (taskIndex + 1) * 24 * 60 * 60 * 1000), // Schedule tasks over next few days
            status: 'pending' as const,
            location: 'To be determined'
          });
          taskIndex++;
        }
      });

      order.assignedWellwisher = wellwisherId;
      order.wellwisherTasks = wellwisherTasks;
      await order.save();
      
      // Send task assignment email to well-wisher (don't fail if email fails)
      try {
        const wellWisher = await User.findById(wellwisherId).select('email name');
        if (wellWisher) {
          const totalTrees = orderItems.reduce((sum, item) => sum + item.quantity, 0);
          const emailSent = await sendWellWisherTaskAssignmentEmail(
            wellWisher.email,
            wellWisher.name || '',
            order.orderId,
            wellwisherTasks,
            {
              totalTrees,
              customerName: session.user.name || session.user.email || 'Customer',
              isGift: isGift || false
            }
          );
          
          if (emailSent) {
            console.log(`[ORDER_CREATE] Task assignment email sent successfully to well-wisher ${wellWisher.email} for order ${order.orderId}`);
          } else {
            console.error(`[ORDER_CREATE] Task assignment email failed to send to well-wisher ${wellWisher.email} for order ${order.orderId}`);
          }
        } else {
          console.error(`[ORDER_CREATE] Well-wisher not found for ID ${wellwisherId} for order ${order.orderId}`);
        }
      } catch (emailError) {
        console.error(`[ORDER_CREATE] Error sending task assignment email for order ${order.orderId}:`, emailError);
      }
    } else {
      console.error(`[ORDER_CREATE] Failed to assign well-wisher to order ${order.orderId} - no well-wisher available`);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        message: 'Tree placed successfully! Thank you for your contribution to the environment.',
        totalAmount,
        items: orderItems.length
      }
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to place order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Increased from 10 to 50
    const status = searchParams.get('status');

    // Ensure userId is explicitly converted to string for proper matching
    // This is critical - MongoDB string fields must match exactly
    if (!session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID not found in session' },
        { status: 401 }
      );
    }
    
    const userId = String(session.user.id).trim();
    const userIdObjectId = session.user.id; // Keep as ObjectId for comparison
    const userEmail = session.user.email?.toLowerCase().trim();
    
    // Build query - include orders where user is the buyer OR the gift recipient OR the customer (for dealer orders)
    // For dealers: show all orders where they are the dealer (userId matches)
    // For customers: show orders where they are the customer (customerUserId matches)
    // MongoDB string fields must match exactly, so ensure proper string conversion
    const queryConditions: Array<Record<string, unknown>> = [
      { userId: userId }, // Always include orders where user is the buyer/dealer (string format)
      { userId: userIdObjectId } // Also check ObjectId format
    ];
    
    // For dealers, they already see their orders via userId
    // For customers (individual users), also include orders where they are the customer
    // Check both string and ObjectId formats for customerUserId
    if (session.user.userType !== 'dealer') {
      queryConditions.push({ customerUserId: userId }); // Include orders where this user is the customer (string format)
      queryConditions.push({ customerUserId: userIdObjectId }); // Also check ObjectId format
    }
    
    // Also include gift orders where this user is the recipient (order-level and item-level)
    if (userEmail) {
      // Case-insensitive email matching using regex
      const emailRegex = new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      
      queryConditions.push({
        giftRecipientEmail: emailRegex,
        isGift: true
      });
      
      // Also include orders where any item has this user as recipient (item-level)
      queryConditions.push({
        'items.recipientEmail': emailRegex
      });
      
      // Also include dealer orders where customer email matches (for customers viewing their orders)
      // Note: Dealers see all their orders via userId, so this is only for customers
      if (session.user.userType !== 'dealer') {
        queryConditions.push({
          'items.customerEmail': emailRegex
        });
      }
    }
    
    // Add status filter to all conditions if provided
    if (status) {
      queryConditions.forEach(condition => {
        condition.status = status;
      });
    }
    
    const query = queryConditions.length > 1 
      ? { $or: queryConditions }
      : queryConditions[0];

    // Debug: Log the query being used
    console.log('[Orders API] Fetching orders for user:', {
      userId: userId,
      userIdType: typeof userId,
      userIdObjectId: userIdObjectId,
      userEmail: userEmail,
      userType: session.user.userType,
      queryConditionsCount: queryConditions.length
    });

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Debug: Log results with dealer order details
    console.log('[Orders API] Found', orders.length, 'orders');
    if (orders.length > 0) {
      const dealerOrders = orders.filter(o => o.userType === 'dealer');
      if (dealerOrders.length > 0) {
        console.log('[Orders API] Found dealer orders:', {
          count: dealerOrders.length,
          dealerOrders: dealerOrders.map(o => ({
            orderId: o.orderId,
            userId: o.userId,
            customerUserId: o.customerUserId,
            customerUserIdType: typeof o.customerUserId,
            customerEmail: o.items?.[0]?.customerEmail,
            paymentStatus: o.paymentStatus,
            status: o.status
          }))
        });
      }
      
      const sampleOrder = orders[0];
      console.log('[Orders API] Sample order:', {
        orderId: sampleOrder.orderId,
        userId: sampleOrder.userId,
        userType: sampleOrder.userType,
        customerUserId: sampleOrder.customerUserId,
        userEmail: sampleOrder.userEmail,
        paymentStatus: sampleOrder.paymentStatus
      });
    } else {
      // If no orders found, check if there are ANY orders in the database
      const totalOrders = await Order.countDocuments({});
      console.log('[Orders API] No orders found. Total orders in database:', totalOrders);
      
      // Check if there are dealer orders with this customerUserId
      if (session.user.userType !== 'dealer') {
        const dealerOrdersForCustomer = await Order.find({
          $or: [
            { customerUserId: userId },
            { customerUserId: userIdObjectId },
            ...(userEmail ? [{ 'items.customerEmail': new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : [])
          ],
          userType: 'dealer'
        }).limit(5).lean();
        
        console.log('[Orders API] Dealer orders for this customer:', {
          count: dealerOrdersForCustomer.length,
          orders: dealerOrdersForCustomer.map((o: { orderId: string; customerUserId?: string; items?: Array<{ customerEmail?: string }> }) => ({
            orderId: o.orderId,
            customerUserId: o.customerUserId,
            customerEmail: o.items?.[0]?.customerEmail
          }))
        });
      }
    }

    // Deduplicate orders: Remove duplicate orders with same items
    // For pending orders: Keep only the most recent one
    // For paid/confirmed orders: Keep all (they're legitimate separate orders)
    const deduplicatedOrders: IOrder[] = [];
    const seenOrderKeys = new Set<string>();
    
    // Sort orders by createdAt descending to keep most recent duplicates
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    for (const order of sortedOrders) {
      // Create a unique key based on items, total amount, and gift status
      const orderKey = JSON.stringify({
        userId: order.userId,
        items: order.items.map(item => ({
          treeId: item.treeId,
          quantity: item.quantity,
          adoptionType: item.adoptionType || 'self'
        })).sort((a, b) => a.treeId.localeCompare(b.treeId)),
        totalAmount: order.totalAmount,
        isGift: order.isGift || false
      });
      
      // For pending orders, deduplicate (keep only most recent)
      // For paid/confirmed orders, only deduplicate if they're exact duplicates
      if (order.paymentStatus === 'pending' && order.status === 'pending') {
        if (seenOrderKeys.has(orderKey)) {
          // Skip duplicate pending order
          continue;
        }
        seenOrderKeys.add(orderKey);
      } else if (order.paymentStatus === 'paid' || order.status === 'confirmed' || order.status === 'planted' || order.status === 'completed') {
        // For paid orders, only deduplicate if exact duplicate exists (same orderId or exact same items + amount + date within 1 minute)
        // This handles cases where payment webhook created duplicate
        const isExactDuplicate = deduplicatedOrders.some(existing => {
          if (existing.orderId === order.orderId) return true;
          
          const timeDiff = Math.abs(new Date(existing.createdAt).getTime() - new Date(order.createdAt).getTime());
          if (timeDiff < 60000) { // Within 1 minute
            const existingKey = JSON.stringify({
              items: existing.items.map(item => ({
                treeId: item.treeId,
                quantity: item.quantity,
                adoptionType: item.adoptionType || 'self'
              })).sort((a, b) => a.treeId.localeCompare(b.treeId)),
              totalAmount: existing.totalAmount,
              isGift: existing.isGift || false
            });
            return existingKey === orderKey;
          }
          return false;
        });
        
        if (isExactDuplicate) {
          continue;
        }
      }
      
      deduplicatedOrders.push(order);
    }
    
    // Sort back by createdAt descending for display
    deduplicatedOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Use same query for count
    const totalCount = await Order.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: deduplicatedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
