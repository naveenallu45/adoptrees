import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

export async function GET(_request: NextRequest, { params }: { params: { publicId: string } }) {
  try {
    await connectDB();

    const pid = (params.publicId || '').toLowerCase();
    const user = await User.findOne({ publicId: pid }).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const orders = await Order.find({
      $or: [
        { userId: String(user._id) },
        { userEmail: user.email }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Do not leak sensitive info
    const safeOrders = orders.map((o: any) => ({
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

    return NextResponse.json({
      success: true,
      data: { orders: safeOrders, user: { name: user.name || user.companyName, userType: user.userType } }
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}


