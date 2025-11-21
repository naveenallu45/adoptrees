import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/api-auth';

export async function GET() {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    // Get all orders without pagination
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Calculate metrics
    const totalCount = orders.length;
    // Only count revenue from paid orders (exclude pending, failed, cancelled)
    const totalRevenue = orders
      .filter(order => order.paymentStatus === 'paid' && order.status !== 'pending')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userTypeCounts = orders.reduce((acc, order) => {
      acc[order.userType] = (acc[order.userType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const giftOrders = orders.filter(order => order.isGift).length;

    return NextResponse.json({
      success: true,
      data: orders,
      metrics: {
        totalCount,
        totalRevenue,
        statusCounts,
        userTypeCounts,
        giftOrders,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch adoptions' },
      { status: 500 }
    );
  }
}
