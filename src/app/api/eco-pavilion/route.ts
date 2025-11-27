import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Tree from '@/models/Tree';
import type { PipelineStage } from 'mongoose';

export interface EcoPavilionMember {
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'individual' | 'company';
  userImage?: string;
  publicId?: string;
  totalTrees: number;
  totalOxygen: number;
  totalCO2: number;
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
    const sortBy = searchParams.get('sortBy') || 'trees'; // 'trees', 'oxygen', 'co2', 'orders'
    const filterType = searchParams.get('filterType') || 'all'; // 'all', 'individual', 'company', 'forest'

    // Build match conditions based on filterType
    const matchConditions: {
      paymentStatus: string;
      status: { $ne: string };
      userType?: string;
    } = {
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' }
    };

    // Add userType filter for individual and company (forests can be from any user type)
    if (filterType === 'individual') {
      matchConditions.userType = 'individual';
    } else if (filterType === 'company') {
      matchConditions.userType = 'company';
    }
    // For 'forest' filter, we'll filter items after unwinding

    // Aggregate users with their order statistics
    const ecoPavilionPipeline: PipelineStage[] = [
      // Match only paid orders with filter conditions
      {
        $match: matchConditions
      },
      // Unwind items to process each item individually
      {
        $unwind: '$items'
      },
      // Filter items based on filterType
      ...(filterType === 'forest' 
        ? [
            {
              $match: {
                $or: [
                  { 'items.treeType': 'forest' },
                  { isForestOrder: true }
                ]
              }
            }
          ]
        : filterType === 'individual' || filterType === 'company'
        ? [
            {
              $match: {
                $and: [
                  { 
                    $or: [
                      { 'items.treeType': { $ne: 'forest' } },
                      { 'items.treeType': { $exists: false } }
                    ]
                  },
                  { 
                    $or: [
                      { isForestOrder: { $ne: true } },
                      { isForestOrder: { $exists: false } }
                    ]
                  }
                ]
              }
            }
          ]
        : []
      ),
      // Convert treeId to ObjectId for lookup
      {
        $addFields: {
          treeIdObjectId: {
            $cond: {
              if: { $eq: [{ $type: '$items.treeId' }, 'string'] },
              then: {
                $convert: {
                  input: '$items.treeId',
                  to: 'objectId',
                  onError: null,
                  onNull: null
                }
              },
              else: '$items.treeId'
            }
          }
        }
      },
      // Lookup tree to get current CO2 value
      {
        $lookup: {
          from: 'trees',
          localField: 'treeIdObjectId',
          foreignField: '_id',
          as: 'treeData'
        }
      },
      // Add computed fields for each item, using tree CO2 if order item doesn't have it
      // Priority: 1. Use co2Kgs from order if it exists (including 0), 2. Use tree.co2 if available, 3. Default to 0
      {
        $addFields: {
          itemCO2: {
            $cond: {
              if: { 
                $and: [
                  { $ne: ['$items.co2Kgs', null] }, 
                  { $ne: ['$items.co2Kgs', undefined] },
                  { $ne: [{ $type: '$items.co2Kgs' }, 'missing'] }
                ] 
              },
              then: '$items.co2Kgs',
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: [{ $arrayElemAt: ['$treeData.co2', 0] }, null] },
                      { $ne: [{ $arrayElemAt: ['$treeData.co2', 0] }, undefined] }
                    ]
                  },
                  then: { $arrayElemAt: ['$treeData.co2', 0] },
                  else: 0
                }
              }
            }
          }
        }
      },
      // Group back by order to calculate order totals
      {
        $group: {
          _id: '$_id',
          userId: { $first: '$userId' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userType: { $first: '$userType' },
          orderTrees: { $sum: '$items.quantity' },
          orderOxygen: { $sum: { $multiply: ['$items.quantity', '$items.oxygenKgs'] } },
          orderCO2: { $sum: { $multiply: ['$items.quantity', '$itemCO2'] } },
          orderAmount: { $first: { $ifNull: ['$finalAmount', '$totalAmount'] } },
          createdAt: { $first: '$createdAt' }
        }
      },
      // Now group by user to aggregate all orders
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userType: { $first: '$userType' },
          totalTrees: { $sum: '$orderTrees' },
          totalOxygen: { $sum: '$orderOxygen' },
          totalCO2: { $sum: '$orderCO2' },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$orderAmount' },
          lastAdoptionDate: { $max: '$createdAt' }
        }
      },
      // Sort based on sortBy parameter
      {
        $sort: sortBy === 'oxygen' 
          ? { totalOxygen: -1 }
          : sortBy === 'co2'
          ? { totalCO2: -1 }
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
          preserveNullAndEmptyArrays: true // Keep eco pavilion members even if user profile not found
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
          totalCO2: { $ifNull: [{ $round: ['$totalCO2', 0] }, 0] },
          totalOrders: 1,
          totalAmount: 1,
          lastAdoptionDate: 1
        }
      }
    ];

    const ecoPavilionData = await Order.aggregate(ecoPavilionPipeline);

    // Debug: Log first eco pavilion member to check data including CO2
    if (ecoPavilionData.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('First eco pavilion member data:', JSON.stringify(ecoPavilionData[0], null, 2));
      console.log('CO2 value:', ecoPavilionData[0].totalCO2, 'Trees:', ecoPavilionData[0].totalTrees);
      
      // Also check a sample order to see CO2 values
      const sampleOrder = await Order.findOne({ 
        paymentStatus: 'paid', 
        status: { $ne: 'cancelled' },
        'items.0': { $exists: true }
      }).lean();
      if (sampleOrder && sampleOrder.items && sampleOrder.items.length > 0) {
        const firstItem = sampleOrder.items[0];
        const tree = await Tree.findById(firstItem.treeId).select('co2 name').lean();
        console.log('Sample order item:', {
          treeId: firstItem.treeId,
          co2Kgs: firstItem.co2Kgs,
          treeName: tree?.name,
          treeCO2: tree?.co2
        });
      }
    }

    // Format eco pavilion members with rank
    const ecoPavilionMembers: EcoPavilionMember[] = ecoPavilionData.map((member, index) => {
      // Ensure CO2 is calculated - use the value from aggregation (stored in orders)
      const co2Value = member.totalCO2 != null && member.totalCO2 !== undefined 
        ? Math.round(member.totalCO2) 
        : 0;
      
      return {
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        userType: member.userType,
        userImage: member.userImage && member.userImage.trim() !== '' ? member.userImage : undefined,
        publicId: member.publicId || undefined,
        totalTrees: member.totalTrees,
        totalOxygen: member.totalOxygen || 0,
        totalCO2: co2Value,
        totalOrders: member.totalOrders,
        totalAmount: member.totalAmount,
        lastAdoptionDate: member.lastAdoptionDate,
        rank: index + 1
      };
    });

    return NextResponse.json({
      success: true,
      data: ecoPavilionMembers,
      count: ecoPavilionMembers.length
    });
  } catch (error) {
    console.error('Error fetching eco pavilion members:', error);
    
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
          : 'Failed to fetch eco pavilion members. Please try again.',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: isConnectionError ? 503 : 500 } // Service Unavailable for connection errors
    );
  }
}

