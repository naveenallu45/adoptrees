import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    await connectDB();

    const { publicId: publicIdParam } = await params;
    const pid = (publicIdParam || '').toLowerCase();
    const userDoc = await User.findOne({ publicId: pid }).lean();
    if (!userDoc || !('_id' in userDoc)) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userDoc as { _id: unknown; email?: string; name?: string; companyName?: string; userType?: string; image?: string };
    
    // Add pagination to prevent loading all orders at once
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default to 50, max 100
    
    const orders = await Order.find({
      $or: [
        { userId: String(user._id) },
        { userEmail: user.email }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Math.min(limit, 100)) // Cap at 100
      .lean();

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
          })).sort((a, b) => a.treeId.localeCompare(b.treeId)),
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
    const safeOrders = deduplicatedOrders.map((o: typeof orders[0]) => ({
      _id: o._id,
      orderId: o.orderId,
      items: o.items,
      totalAmount: o.totalAmount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      isGift: o.isGift,
      giftRecipientName: o.giftRecipientName,
      giftRecipientEmail: o.giftRecipientEmail,
      giftMessage: o.giftMessage,
      assignedWellwisher: o.assignedWellwisher,
      wellwisherTasks: o.wellwisherTasks,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    // Get total count for pagination
    const totalCount = await Order.countDocuments({
      $or: [
        { userId: String(user._id) },
        { userEmail: user.email }
      ]
    });

    return NextResponse.json({
      success: true,
      data: { 
        orders: safeOrders, 
        user: { 
          name: user.name || user.companyName, 
          userType: user.userType,
          image: user.image 
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


