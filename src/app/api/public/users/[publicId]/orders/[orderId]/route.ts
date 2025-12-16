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

// Simple ObjectId validator to avoid CastErrors for non-hex order IDs
function isLikelyObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
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
    // Explicitly select name, companyName, image, and userType fields
    const publicIdRegex = new RegExp(`^${escapeRegExp(rawPublicId)}$`, 'i');
    const userDoc = await User.findOne({ publicId: publicIdRegex })
      .select('name companyName image userType email')
      .lean();
    
    if (!userDoc || !('_id' in userDoc)) {
      console.error(`[PublicAPI] User not found for publicId: ${rawPublicId} when fetching order ${orderIdParam}`);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userDoc as { _id: unknown; email?: string; name?: string; companyName?: string; userType?: string; image?: string };
    
    // Build a safe query for the specific order
    const orConditions: Record<string, unknown>[] = [
      { orderId: orderIdParam, userId: String(user._id) },
      { orderId: orderIdParam, userEmail: user.email },
    ];

    // Only query by _id when the parameter looks like a valid ObjectId
    if (isLikelyObjectId(orderIdParam)) {
      orConditions.push(
        { _id: orderIdParam, userId: String(user._id) },
        { _id: orderIdParam, userEmail: user.email }
      );
    }

    const order = await Order.findOne({
      $or: orConditions,
      paymentStatus: 'paid', // Only show paid orders for public viewing
    }).lean();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Get user display name - prefer name for individuals, companyName for companies
    const displayName = user.userType === 'company' 
      ? (user.companyName || user.name || 'Company')
      : (user.name || user.companyName || 'User');

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
      userName: displayName, // Include userName for compatibility with tree detail page
    };

    return NextResponse.json({
      success: true,
      data: safeOrder,
      user: {
        name: displayName,
        companyName: user.companyName || null,
        userType: user.userType,
        image: user.image || null // Always include image field, even if null
      }
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

