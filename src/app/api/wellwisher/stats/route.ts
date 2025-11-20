import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { auth } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/wellwisher/stats
 * Get well-wisher statistics including task counts and recent activity
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a wellwisher
    if (session.user.role !== 'wellwisher') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Wellwisher role required.' },
        { status: 403 }
      );
    }

    await connectDB();

    const userId = session.user.id;

    // Get task counts for each status
    const [pendingCount, inProgressCount, completedCount, updatingCount] = await Promise.all([
      // Pending tasks count
      Order.aggregate([
        {
          $match: {
            assignedWellwisher: userId,
            wellwisherTasks: { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$wellwisherTasks' },
        {
          $match: {
            'wellwisherTasks.status': 'pending'
          }
        },
        { $count: 'total' }
      ]),
      // In progress tasks count
      Order.aggregate([
        {
          $match: {
            assignedWellwisher: userId,
            wellwisherTasks: { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$wellwisherTasks' },
        {
          $match: {
            'wellwisherTasks.status': 'in_progress'
          }
        },
        { $count: 'total' }
      ]),
      // Completed tasks count
      Order.aggregate([
        {
          $match: {
            assignedWellwisher: userId,
            wellwisherTasks: { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$wellwisherTasks' },
        {
          $match: {
            'wellwisherTasks.status': 'completed'
          }
        },
        { $count: 'total' }
      ]),
      // Tasks needing growth update count
      Order.aggregate([
        {
          $match: {
            assignedWellwisher: userId,
            wellwisherTasks: { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$wellwisherTasks' },
        {
          $match: {
            'wellwisherTasks.status': 'completed',
            'wellwisherTasks.nextGrowthUpdateDue': { $lte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        },
        { $count: 'total' }
      ])
    ]);

    // Calculate total trees helped (sum of quantities from all completed tasks)
    const treesHelpedResult = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: userId,
          wellwisherTasks: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$wellwisherTasks' },
      {
        $match: {
          'wellwisherTasks.status': 'completed'
        }
      },
      {
        $unwind: {
          path: '$items',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: null,
          totalTrees: { $sum: '$items.quantity' }
        }
      }
    ]);

    // Get recent activity (last 5 tasks across all statuses, sorted by updated date)
    const recentActivity = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: userId,
          wellwisherTasks: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$wellwisherTasks' },
      {
        $project: {
          taskId: '$wellwisherTasks.taskId',
          task: '$wellwisherTasks.task',
          status: '$wellwisherTasks.status',
          orderId: '$orderId',
          scheduledDate: '$wellwisherTasks.scheduledDate',
          completedAt: '$wellwisherTasks.plantingDetails.completedAt',
          plantedAt: '$wellwisherTasks.plantingDetails.plantedAt',
          growthUpdates: '$wellwisherTasks.growthUpdates',
          lastUpdate: {
            $cond: {
              if: { $ne: ['$wellwisherTasks.plantingDetails.completedAt', null] },
              then: '$wellwisherTasks.plantingDetails.completedAt',
              else: {
                $cond: {
                  if: { $ne: ['$wellwisherTasks.plantingDetails.plantedAt', null] },
                  then: '$wellwisherTasks.plantingDetails.plantedAt',
                  else: {
                    $cond: {
                      if: { 
                        $and: [
                          { $ne: ['$wellwisherTasks.growthUpdates', null] },
                          { $gt: [{ $size: { $ifNull: ['$wellwisherTasks.growthUpdates', []] } }, 0] }
                        ]
                      },
                      then: { 
                        $arrayElemAt: [
                          { $map: {
                            input: '$wellwisherTasks.growthUpdates',
                            as: 'update',
                            in: '$$update.uploadedAt'
                          }},
                          -1
                        ]
                      },
                      else: '$wellwisherTasks.scheduledDate'
                    }
                  }
                }
              }
            }
          }
        }
      },
      { $sort: { lastUpdate: -1 } },
      { $limit: 5 }
    ]);

    // Format recent activity
    const formattedActivity = recentActivity.map((activity) => {
      const timeAgo = getTimeAgo(new Date(activity.lastUpdate));
      return {
        id: activity.taskId,
        task: activity.task,
        status: activity.status,
        orderId: activity.orderId,
        timeAgo,
        timestamp: activity.lastUpdate
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        upcomingTasks: pendingCount[0]?.total || 0,
        ongoingTasks: inProgressCount[0]?.total || 0,
        completedTasks: completedCount[0]?.total || 0,
        updatingTasks: updatingCount[0]?.total || 0,
        treesHelped: treesHelpedResult[0]?.totalTrees || 0,
        recentActivity: formattedActivity
      }
    });

  } catch (error) {
    console.error('Error fetching well-wisher stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

