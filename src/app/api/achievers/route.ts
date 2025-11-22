import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import type { PipelineStage } from 'mongoose';

export interface Achiever {
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'individual' | 'company';
  userImage?: string;
  publicId?: string;
  totalTrees: number;
  totalOxygen: number;
  totalOrders: number;
  totalAmount: number;
  lastAdoptionDate?: Date;
  rank: number;
}

export async function GET(request: NextRequest) {
  try {
    // Attempt database connection with timeout
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed. Please try again later.',
          details: process.env.NODE_ENV === 'development' 
            ? (dbError instanceof Error ? dbError.message : 'Unknown error')
            : undefined
        },
        { status: 503 } // Service Unavailable
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sortBy = searchParams.get('sortBy') || 'trees'; // 'trees', 'oxygen', 'orders'

    // Aggregate users with their order statistics
    const achieversPipeline: PipelineStage[] = [
      // Match only paid orders
      {
        $match: {
          paymentStatus: 'paid',
          status: { $ne: 'cancelled' }
        }
      },
      // Add computed fields before unwinding
      {
        $addFields: {
          orderTrees: { $sum: '$items.quantity' },
          orderOxygen: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.quantity', '$$item.oxygenKgs'] } } } },
          orderAmount: { $ifNull: ['$finalAmount', '$totalAmount'] }
        }
      },
      // Group by user and order to get order-level totals
      {
        $group: {
          _id: { userId: '$userId', orderId: '$_id' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userType: { $first: '$userType' },
          orderTrees: { $first: '$orderTrees' },
          orderOxygen: { $first: '$orderOxygen' },
          orderAmount: { $first: '$orderAmount' },
          createdAt: { $first: '$createdAt' }
        }
      },
      // Now group by user to aggregate all orders
      {
        $group: {
          _id: '$_id.userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userType: { $first: '$userType' },
          totalTrees: { $sum: '$orderTrees' },
          totalOxygen: { $sum: '$orderOxygen' },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$orderAmount' },
          lastAdoptionDate: { $max: '$createdAt' }
        }
      },
      // Sort based on sortBy parameter
      {
        $sort: sortBy === 'oxygen' 
          ? { totalOxygen: -1 }
          : sortBy === 'orders'
          ? { totalOrders: -1 }
          : { totalTrees: -1 }
      },
      // Limit results
      {
        $limit: limit
      },
      // Add lookup stage to get user profile data
      // Convert string _id to ObjectId for matching, with error handling
      {
        $addFields: {
          userIdObjectId: {
            $convert: {
              input: '$_id',
              to: 'objectId',
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObjectId',
          foreignField: '_id',
          as: 'userProfile'
        }
      },
      // Unwind user profile (should be single document)
      {
        $unwind: {
          path: '$userProfile',
          preserveNullAndEmptyArrays: true // Keep achievers even if user profile not found
        }
      },
      // Project final fields with user profile data
      {
        $project: {
          userId: { $toString: '$_id' },
          userName: 1,
          userEmail: 1,
          userType: 1,
          userImage: { 
            $cond: {
              if: { $and: [{ $ne: ['$userProfile.image', null] }, { $ne: ['$userProfile.image', ''] }] },
              then: '$userProfile.image',
              else: null
            }
          },
          publicId: { $ifNull: ['$userProfile.publicId', null] },
          totalTrees: 1,
          totalOxygen: { $round: ['$totalOxygen', 2] },
          totalOrders: 1,
          totalAmount: 1,
          lastAdoptionDate: 1
        }
      }
    ];

    const achieversData = await Order.aggregate(achieversPipeline);

    // Debug: Log first achiever to check userImage
    if (achieversData.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('First achiever data:', JSON.stringify(achieversData[0], null, 2));
    }

    // Format achievers with rank
    const achievers: Achiever[] = achieversData.map((achiever, index) => ({
      userId: achiever.userId,
      userName: achiever.userName,
      userEmail: achiever.userEmail,
      userType: achiever.userType,
      userImage: achiever.userImage && achiever.userImage.trim() !== '' ? achiever.userImage : undefined,
      publicId: achiever.publicId || undefined,
      totalTrees: achiever.totalTrees,
      totalOxygen: achiever.totalOxygen,
      totalOrders: achiever.totalOrders,
      totalAmount: achiever.totalAmount,
      lastAdoptionDate: achiever.lastAdoptionDate,
      rank: index + 1
    }));

    return NextResponse.json({
      success: true,
      data: achievers,
      count: achievers.length
    });
  } catch (error) {
    console.error('Error fetching achievers:', error);
    
    // Check if it's a MongoDB connection error
    const isConnectionError = error instanceof Error && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('querySrv') ||
      error.message.includes('connection') ||
      error.message.includes('timeout')
    );

    return NextResponse.json(
      {
        success: false,
        error: isConnectionError 
          ? 'Database connection failed. Please try again later.'
          : 'Failed to fetch achievers. Please try again.',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: isConnectionError ? 503 : 500 } // Service Unavailable for connection errors
    );
  }
}

