import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { IOrder } from '@/models/Order';
import Tree from '@/models/Tree';
import { auth } from '@/app/api/auth/[...nextauth]/route';

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
    const { items, isGift, giftRecipientName, giftRecipientEmail, giftMessage } = body;

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

    // Calculate total amount
    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);

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
      const wellwisherTasks = orderItems.map((item, index) => ({
        taskId: `${orderId}-${index}`, // Use existing order ID (like WEL60136-0, WEL60136-1)
        task: `Plant and care for ${item.treeName}`,
        description: `Plant ${item.quantity} ${item.treeName} tree(s) and provide ongoing care. ${isGift && giftMessage ? `Gift message: ${giftMessage}` : ''}`,
        scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Schedule tasks over next few days
        priority: 'medium' as const,
        status: 'pending' as const,
        location: 'To be determined'
      }));

      order.assignedWellwisher = wellwisherId;
      order.wellwisherTasks = wellwisherTasks;
      await order.save();
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
    const userEmail = session.user.email?.toLowerCase().trim();
    
    // Build query - use userId as primary filter
    // MongoDB string fields must match exactly, so ensure proper string conversion
    const query: { userId: string; status?: string } = {
      userId: userId
    };
    
    if (status) {
      query.status = status;
    }

    // Debug: Log the query being used
    console.log('[Orders API] Fetching orders for userId:', userId, 'userEmail:', userEmail);
    console.log('[Orders API] Query:', JSON.stringify(query, null, 2));

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Debug: Log results
    console.log('[Orders API] Found', orders.length, 'orders');
    if (orders.length > 0) {
      const sampleOrder = orders[0];
      console.log('[Orders API] Sample order - userId:', sampleOrder.userId, 'userEmail:', sampleOrder.userEmail);
      console.log('[Orders API] Query userId matches sample?', sampleOrder.userId === userId);
      console.log('[Orders API] Query userEmail matches sample?', sampleOrder.userEmail === userEmail);
    } else {
      // If no orders found, check if there are ANY orders in the database
      const totalOrders = await Order.countDocuments({});
      console.log('[Orders API] Total orders in database:', totalOrders);
      if (totalOrders > 0) {
        const sampleOrder = await Order.findOne({}).lean();
        if (sampleOrder) {
          console.log('[Orders API] Sample order from DB - userId:', sampleOrder.userId, 'userEmail:', sampleOrder.userEmail);
        }
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
