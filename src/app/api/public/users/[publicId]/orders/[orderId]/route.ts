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

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ publicId: string; orderId: string }> }
) {
  try {
    await connectDB();

    const { publicId: publicIdParam, orderId: orderIdParam } = await params;
    const rawPublicId = (publicIdParam || '').trim();
    
    if (!rawPublicId) {
      return NextResponse.json({ success: false, error: 'Invalid public ID' }, { status: 400 });
    }
    
    // Query user by publicId (case-insensitive to support legacy mixed-case IDs)
    const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
    const userDoc = await User.findOne({ publicId: publicIdRegex }).lean();
    
    if (!userDoc || !('_id' in userDoc)) {
      console.error(`[PublicAPI] User not found for publicId: ${rawPublicId} when fetching order ${orderIdParam}`);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userDoc as { _id: unknown; email?: string; name?: string; companyName?: string; image?: string };
    
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
      data: safeOrder,
      user: {
        name: user.name || user.companyName,
        image: user.image
      }
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

