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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const userType = searchParams.get('userType') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: Record<string, unknown> = {};

    // Search filter
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { 'items.treeName': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // User type filter
    if (userType) {
      query.userType = userType;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {} as Record<string, Date>;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        (query.createdAt as Record<string, Date>).$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (query.createdAt as Record<string, Date>).$lte = end;
      }
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Use aggregation pipeline for better performance
    const pipeline = [
      { $match: query },
      {
        $facet: {
          orders: [
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [{ $count: 'count' }],
          metrics: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$totalAmount' },
                statusCounts: {
                  $push: {
                    status: '$status',
                    count: 1
                  }
                },
                userTypeCounts: {
                  $push: {
                    userType: '$userType',
                    count: 1
                  }
                }
              }
            }
          ]
        }
      }
    ];

    const [result] = await Order.aggregate(pipeline);
    const orders = result.orders;
    const totalCount = result.totalCount[0]?.count || 0;
    const metrics = result.metrics[0] || { totalRevenue: 0, statusCounts: [], userTypeCounts: [] };
    
    // Process status and user type counts
    const statusCountsMap = metrics.statusCounts.reduce((acc: Record<string, number>, item: { status: string; count: number }) => {
      acc[item.status] = (acc[item.status] || 0) + item.count;
      return acc;
    }, {});
    
    const userTypeCountsMap = metrics.userTypeCounts.reduce((acc: Record<string, number>, item: { userType: string; count: number }) => {
      acc[item.userType] = (acc[item.userType] || 0) + item.count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
        limit
      },
      metrics: {
        totalRevenue: metrics.totalRevenue || 0,
        statusCounts: statusCountsMap,
        userTypeCounts: userTypeCountsMap
      }
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch adoptions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();
    const { orderId, status, notes } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    order.status = status;
    if (notes) {
      order.adminNotes = notes;
    }
    order.updatedAt = new Date();

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update adoption' },
      { status: 500 }
    );
  }
}
