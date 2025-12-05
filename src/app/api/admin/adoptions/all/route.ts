import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const metricsOnly = searchParams.get('metricsOnly') === 'true';

    // OPTIMIZED: Use aggregation pipeline to calculate metrics in database
    // This is much faster than loading all orders into memory
    const [metricsResult] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$paymentStatus', 'paid'] },
                    { $ne: ['$status', 'pending'] }
                  ]
                },
                '$totalAmount',
                0
              ]
            }
          },
          statusCounts: {
            $push: '$status'
          },
          userTypeCounts: {
            $push: '$userType'
          },
          giftOrders: {
            $sum: { $cond: ['$isGift', 1, 0] }
          }
        }
      }
    ]);

    // Process status and userType counts
    const statusCounts: Record<string, number> = {};
    const userTypeCounts: Record<string, number> = {};
    
    if (metricsResult) {
      metricsResult.statusCounts?.forEach((status: string) => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      metricsResult.userTypeCounts?.forEach((userType: string) => {
        userTypeCounts[userType] = (userTypeCounts[userType] || 0) + 1;
      });
    }

    const metrics = {
      totalCount: metricsResult?.totalCount || 0,
      totalRevenue: metricsResult?.totalRevenue || 0,
      statusCounts,
      userTypeCounts,
      giftOrders: metricsResult?.giftOrders || 0,
    };

    // If only metrics are needed (e.g., for dashboard stats), return early
    if (metricsOnly) {
      return NextResponse.json(
        {
          success: true,
          metrics,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // OPTIMIZED: Fetch orders with lean() for better performance
    // Only fetch necessary fields to reduce memory usage
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json(
      {
        success: true,
        data: orders,
        metrics,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch adoptions' },
      { status: 500 }
    );
  }
}
