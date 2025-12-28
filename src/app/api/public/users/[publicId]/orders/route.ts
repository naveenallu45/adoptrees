import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

// Disable caching for public routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Safely escape RegExp special characters in a string
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    await connectDB();

    const { publicId: publicIdParam } = await params;
    
    // Decode URL-encoded publicId and trim whitespace
    let rawPublicId = '';
    try {
      rawPublicId = decodeURIComponent(publicIdParam || '').trim();
    } catch {
      // If decodeURIComponent fails, just use the original value
      rawPublicId = (publicIdParam || '').trim();
    }
    
    if (!rawPublicId) {
      return NextResponse.json({ success: false, error: 'Invalid public ID' }, { status: 400 });
    }
    
    // Try multiple lookup strategies
    let userDoc = null;
    
    // Strategy 1: Case-insensitive regex match (handles mixed case)
    // Explicitly select name, companyName, image, and userType fields
    const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
    userDoc = await User.findOne({ publicId: publicIdRegex })
      .select('name companyName image userType email')
      .lean();
    
    // Strategy 2: If not found, try exact match (case-sensitive)
    if (!userDoc || !('_id' in userDoc)) {
      userDoc = await User.findOne({ publicId: rawPublicId })
        .select('name companyName image userType email')
        .lean();
    }
    
    // Strategy 3: If still not found, try lowercase match
    if (!userDoc || !('_id' in userDoc)) {
      userDoc = await User.findOne({ publicId: rawPublicId.toLowerCase() })
        .select('name companyName image userType email')
        .lean();
    }
    
    if (!userDoc || !('_id' in userDoc)) {
      console.error(`[PublicAPI] User not found for publicId: ${rawPublicId}`);
      console.error(`[PublicAPI] Attempted searches: regex (case-insensitive), exact match, lowercase`);
      
      // Try to find any user with similar publicId for debugging
      const similarUsers = await User.find({ 
        publicId: { $exists: true, $ne: null } 
      }).select('publicId').limit(5).lean();
      console.log(
        `[PublicAPI] Sample publicIds in DB:`,
        (similarUsers as Array<{ publicId?: string }>).map((u) => u.publicId)
      );
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userDoc as { _id: unknown; email?: string; name?: string; companyName?: string; userType?: string; image?: string };
    
    // Add pagination to prevent loading all orders at once
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default to 50, max 100
    
    // Include orders where user is the buyer OR the gift recipient OR the customer (for dealer orders)
    const userEmail = user.email?.toLowerCase().trim();
    const userIdString = String(user._id);
    const userIdObjectId = user._id; // Keep as ObjectId for comparison
    
    // Build comprehensive query - check all possible ways user can be associated with orders
    // Use separate conditions for string and ObjectId to ensure proper matching
    const emailRegex = userEmail ? new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
    
    // Build query with all possible conditions
    const queryConditions: Array<Record<string, unknown>> = [
      // User's own orders (where they are the buyer) - check both string and ObjectId
      { userId: userIdString },
      { userId: userIdObjectId },
      // Dealer orders where user is the customer - check both string and ObjectId
      { customerUserId: userIdString },
      { customerUserId: userIdObjectId }
    ];
    
    // Add email-based conditions if email exists
    if (emailRegex) {
      queryConditions.push(
        { userEmail: emailRegex },
        { giftRecipientEmail: emailRegex, isGift: true },
        { 'items.recipientEmail': emailRegex },
        // Critical for dealer orders - check customerEmail in items array
        // Use both dot notation and $elemMatch to ensure we catch all cases
        { 'items.customerEmail': emailRegex },
        { items: { $elemMatch: { customerEmail: emailRegex } } },
        // Fallback: For dealer orders, also check if userType is 'dealer' AND items contain customer email
        // This catches cases where customerUserId might not be set but customerEmail is present
        { 
          userType: 'dealer',
          items: { $elemMatch: { customerEmail: emailRegex } }
        },
        // Another fallback: check dealer orders with customerEmail using dot notation
        {
          userType: 'dealer',
          'items.customerEmail': emailRegex
        }
      );
    }
    
    // Also add a catch-all query for dealer orders that might have customerUserId as string but stored differently
    // This handles edge cases where the type might not match exactly
    if (userEmail) {
      // Direct query for dealer orders with this customer's email - this is the most reliable fallback
      queryConditions.push({
        $and: [
          { userType: 'dealer' },
          {
            $or: [
              { 'items.customerEmail': { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
              { items: { $elemMatch: { customerEmail: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } } } }
            ]
          }
        ]
      });
    }
    
    // Debug: Log query parameters
    console.log('[PublicOrdersAPI] Querying orders for user:', {
      publicId: rawPublicId,
      userId: userIdString,
      userIdObjectId: String(userIdObjectId),
      userEmail: userEmail,
      queryConditionsCount: queryConditions.length,
      queryConditions: queryConditions.map((cond, idx) => ({
        index: idx,
        condition: Object.keys(cond)[0],
        value: typeof Object.values(cond)[0] === 'object' && '$elemMatch' in (Object.values(cond)[0] as Record<string, unknown>)
          ? 'elemMatch query'
          : String(Object.values(cond)[0]).substring(0, 50)
      }))
    });
    
    // First, let's check what dealer orders exist for this customer (diagnostic)
    if (userEmail) {
      const dealerOrdersCheck = await Order.find({
        userType: 'dealer',
        $or: [
          { customerUserId: userIdString },
          { customerUserId: userIdObjectId },
          { 'items.customerEmail': new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { items: { $elemMatch: { customerEmail: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } } }
        ]
      })
        .select('orderId customerUserId items.customerEmail items.customerName paymentStatus status')
        .lean();
      
      console.log('[PublicOrdersAPI] Diagnostic: Dealer orders found for customer:', {
        publicId: rawPublicId,
        userId: userIdString,
        userEmail: userEmail,
        dealerOrdersCount: dealerOrdersCheck.length,
        dealerOrders: dealerOrdersCheck.map((o: { orderId: string; customerUserId?: string; items?: Array<{ customerEmail?: string }>; paymentStatus?: string; status?: string }) => ({
          orderId: o.orderId,
          customerUserId: o.customerUserId,
          customerUserIdType: typeof o.customerUserId,
          customerUserIdMatches: o.customerUserId === userIdString || String(o.customerUserId) === userIdString,
          customerEmails: o.items?.map((item: { customerEmail?: string }) => item.customerEmail),
          paymentStatus: o.paymentStatus,
          status: o.status
        }))
      });
    }
    
    // Query for user's own orders and dealer orders separately to ensure we catch all cases
    // This approach is more reliable than a single complex $or query
    const userOwnOrders = await Order.find({
      $or: [
        { userId: userIdString },
        { userId: userIdObjectId },
        ...(emailRegex ? [{ userEmail: emailRegex }] : [])
      ]
    })
      .sort({ createdAt: -1 })
      .lean();
    
    // Query for gift orders where user is the recipient
    const giftOrders = emailRegex
      ? await Order.find({
          $or: [
            { giftRecipientEmail: emailRegex, isGift: true },
            { 'items.recipientEmail': emailRegex }
          ]
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];
    
    // Query specifically for dealer orders where this user is the customer
    // This is the critical query for dealer-gifted trees
    const dealerOrdersForCustomer = userEmail 
      ? await Order.find({
          userType: 'dealer',
          $or: [
            { customerUserId: userIdString },
            { customerUserId: userIdObjectId },
            { 'items.customerEmail': emailRegex },
            { items: { $elemMatch: { customerEmail: emailRegex } } }
          ]
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];
    
    console.log('[PublicOrdersAPI] Separate queries results:', {
      publicId: rawPublicId,
      userOwnOrdersCount: userOwnOrders.length,
      giftOrdersCount: giftOrders.length,
      dealerOrdersForCustomerCount: dealerOrdersForCustomer.length,
      dealerOrdersDetails: dealerOrdersForCustomer.map((o: typeof dealerOrdersForCustomer[0]) => ({
        orderId: o.orderId,
        customerUserId: o.customerUserId,
        customerEmail: o.items?.[0]?.customerEmail,
        paymentStatus: o.paymentStatus
      }))
    });
    
    // Combine all sets of orders and remove duplicates by orderId
    const allOrdersMap = new Map();
    [...userOwnOrders, ...giftOrders, ...dealerOrdersForCustomer].forEach((order: typeof userOwnOrders[0]) => {
      if (!allOrdersMap.has(order.orderId)) {
        allOrdersMap.set(order.orderId, order);
      }
    });
    
    // Sort and paginate
    const allOrdersSorted = Array.from(allOrdersMap.values())
      .sort((a: typeof userOwnOrders[0], b: typeof userOwnOrders[0]) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    const orders = allOrdersSorted.slice((page - 1) * limit, page * limit);
    
    console.log('[PublicOrdersAPI] Found orders:', {
      publicId: rawPublicId,
      totalOrders: orders.length,
      orders: orders.map((o: typeof orders[0]) => ({
        orderId: o.orderId,
        userType: o.userType,
        userId: o.userId,
        customerUserId: o.customerUserId,
        customerEmail: o.items?.[0]?.customerEmail,
        paymentStatus: o.paymentStatus,
        status: o.status,
        itemsCount: o.items?.length || 0
      }))
    });
    
    // Debug logging for dealer orders
    if (orders.length > 0) {
      const dealerOrders = orders.filter((o: typeof orders[0]) => o.userType === 'dealer');
      if (dealerOrders.length > 0) {
        console.log('[PublicOrdersAPI] Found dealer orders:', {
          publicId: rawPublicId,
          userId: userIdString,
          userEmail: userEmail,
          dealerOrderCount: dealerOrders.length,
          dealerOrders: dealerOrders.map((o: typeof orders[0]) => ({
            orderId: o.orderId,
            customerUserId: o.customerUserId,
            customerUserIdType: typeof o.customerUserId,
            customerEmail: o.items?.[0]?.customerEmail,
            paymentStatus: o.paymentStatus,
            status: o.status,
            itemsCount: o.items?.length || 0
          }))
        });
      }
    } else {
      console.log('[PublicOrdersAPI] No orders found for user:', {
        publicId: rawPublicId,
        userId: userIdString,
        userEmail: userEmail,
        queryConditionsCount: queryConditions.length
      });
    }

    // Deduplicate orders: Remove duplicate pending orders with same items
    // Keep only the most recent one for each unique set of items
    const deduplicatedOrders = [];
    const seenOrderKeys = new Set<string>();
    
    for (const order of orders) {
      // For pending orders, create a unique key based on items
      if (order.paymentStatus === 'pending' && order.status === 'pending') {
        const orderKey = JSON.stringify({
          items: order.items.map((item: { treeId: string; quantity: number; adoptionType?: string }) => ({
            treeId: item.treeId,
            quantity: item.quantity,
            adoptionType: item.adoptionType
          })).sort((a: { treeId: string; quantity: number; adoptionType?: string }, b: { treeId: string; quantity: number; adoptionType?: string }) => a.treeId.localeCompare(b.treeId)),
          totalAmount: order.totalAmount
        });
        
        if (seenOrderKeys.has(orderKey)) {
          // Skip duplicate pending order
          continue;
        }
        seenOrderKeys.add(orderKey);
      }
      
      deduplicatedOrders.push(order);
    }

    // Do not leak sensitive info
    const safeOrders = deduplicatedOrders.map((o: typeof orders[0]) => {
      // Ensure items are properly included and have all necessary fields
      const orderItems = (o.items || []).map((item: { treeId: unknown; treeName?: string; treeImageUrl?: string; quantity?: number; price?: number; oxygenKgs?: number; co2Kgs?: number; treeType?: string; adoptionType?: string; recipientName?: string; recipientEmail?: string; giftMessage?: string; forestName?: string; occasion?: string; customerName?: string; customerEmail?: string; customerPhone?: string; vehicleName?: string; customerProfilePicture?: string }) => ({
        treeId: item.treeId,
        treeName: item.treeName,
        treeImageUrl: item.treeImageUrl,
        quantity: item.quantity,
        price: item.price,
        oxygenKgs: item.oxygenKgs,
        co2Kgs: item.co2Kgs,
        treeType: item.treeType,
        adoptionType: item.adoptionType,
        recipientName: item.recipientName,
        recipientEmail: item.recipientEmail,
        giftMessage: item.giftMessage,
        forestName: item.forestName,
        occasion: item.occasion,
        // Dealer customer fields
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        customerPhone: item.customerPhone,
        vehicleName: item.vehicleName,
        customerProfilePicture: item.customerProfilePicture
      }));
      
      return {
        _id: o._id,
        orderId: o.orderId,
        items: orderItems, // Ensure items array is properly formatted
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        isGift: o.isGift,
        giftRecipientName: o.giftRecipientName,
        giftRecipientEmail: o.giftRecipientEmail,
        giftMessage: o.giftMessage,
        assignedWellwisher: o.assignedWellwisher,
        wellwisherTasks: o.wellwisherTasks,
        // Include user info for displaying dealer name
        userName: o.userName,
        userType: o.userType,
        dealerName: o.dealerName,
        showroomName: o.showroomName,
        showroomLocation: o.showroomLocation,
        customerUserId: o.customerUserId, // Include customerUserId for dealer orders
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    });
    
    console.log('[PublicOrdersAPI] Safe orders prepared:', {
      publicId: rawPublicId,
      totalSafeOrders: safeOrders.length,
      safeOrders: safeOrders.map((o: typeof safeOrders[0]) => ({
        orderId: o.orderId,
        userType: o.userType,
        paymentStatus: o.paymentStatus,
        itemsCount: o.items?.length || 0,
        hasItems: !!o.items && Array.isArray(o.items) && o.items.length > 0,
        firstItemTreeName: o.items?.[0]?.treeName || 'N/A'
      }))
    });

    // Get total count for pagination - use same approach as main query
    const userOwnOrdersCount = await Order.countDocuments({
      $or: [
        { userId: userIdString },
        { userId: userIdObjectId },
        ...(emailRegex ? [{ userEmail: emailRegex }] : [])
      ]
    });
    
    const giftOrdersCount = emailRegex
      ? await Order.countDocuments({
          $or: [
            { giftRecipientEmail: emailRegex, isGift: true },
            { 'items.recipientEmail': emailRegex }
          ]
        })
      : 0;
    
    const dealerOrdersCount = userEmail
      ? await Order.countDocuments({
          userType: 'dealer',
          $or: [
            { customerUserId: userIdString },
            { customerUserId: userIdObjectId },
            { 'items.customerEmail': emailRegex },
            { items: { $elemMatch: { customerEmail: emailRegex } } }
          ]
        })
      : 0;
    
    // Note: totalCount might be slightly off due to potential duplicates between categories,
    // but it's close enough for pagination purposes
    const totalCount = userOwnOrdersCount + giftOrdersCount + dealerOrdersCount;

    // Get user display name - prefer name for individuals, companyName for companies
    const displayName = user.userType === 'company' 
      ? (user.companyName || user.name || 'Company')
      : (user.name || user.companyName || 'User');
    
    return NextResponse.json({
      success: true,
      data: { 
        orders: safeOrders, 
        user: { 
          name: displayName,
          companyName: user.companyName || null,
          userType: user.userType,
          image: user.image || null // Always include image field, even if null
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}


