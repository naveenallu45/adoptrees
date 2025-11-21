import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ publicId: string; orderId: string }> }
) {
  try {
    await connectDB();

    const { publicId: publicIdParam, orderId: orderIdParam } = await params;
    const pid = (publicIdParam || '').toLowerCase();
    
    const userDoc = await User.findOne({ publicId: pid }).lean();
    if (!userDoc || !('_id' in userDoc)) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userDoc as { _id: unknown; email?: string };
    
    // Find the specific order
    const order = await Order.findOne({
      $or: [
        { orderId: orderIdParam, userId: String(user._id) },
        { orderId: orderIdParam, userEmail: user.email },
        { _id: orderIdParam, userId: String(user._id) },
        { _id: orderIdParam, userEmail: user.email }
      ],
      paymentStatus: 'paid' // Only show paid orders for public viewing
    }).lean();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Do not leak sensitive info
    const safeOrder = {
      _id: order._id,
      orderId: order.orderId,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      isGift: order.isGift,
      giftRecipientName: order.giftRecipientName,
      giftRecipientEmail: order.giftRecipientEmail,
      giftMessage: order.giftMessage,
      assignedWellwisher: order.assignedWellwisher,
      wellwisherTasks: order.wellwisherTasks,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: safeOrder
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

