import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import logger from '@/lib/logger';

/**
 * Vercel Cron Job: Quarterly Task (90-day)
 * Runs daily at 3:00 AM UTC
 * Moves completed tasks to 'updating' status after 90 days since completion
 */
export async function GET(request: NextRequest) {
  // Verify this is a Vercel Cron request
  // Vercel automatically adds 'x-vercel-cron' header for cron jobs
  // Also allow manual testing with CRON_SECRET if provided
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if it's a Vercel cron request OR if CRON_SECRET is set and matches
  if (!vercelCronHeader && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - This endpoint can only be called by Vercel Cron or with valid CRON_SECRET' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    
    logger.info('Quarterly (90-day) cron job executing', {
      today,
      ninetyDaysAgo,
      checkingFor: 'Tasks completed 90+ days ago'
    });
    
    // Find all orders with completed tasks that were completed 90+ days ago
    const orders = await Order.find({
      'wellwisherTasks.status': 'completed',
      'wellwisherTasks.plantingDetails.completedAt': { $lte: ninetyDaysAgo }
    });

    let tasksMovedToUpdating = 0;
    const tasksDetails: Array<{
      orderId: string;
      taskId: string;
      completedAt: Date;
      daysSinceCompletion: number;
    }> = [];

    for (const order of orders) {
      if (!order.wellwisherTasks) continue;

      for (const task of order.wellwisherTasks) {
        if (
          task.status === 'completed' &&
          task.plantingDetails?.completedAt &&
          task.plantingDetails.completedAt <= ninetyDaysAgo
        ) {
          // Only move to updating if not already updating
          // This prevents moving tasks that are already in updating status
          try {
            const updateResult = await Order.findOneAndUpdate(
              {
                _id: order._id,
                'wellwisherTasks.taskId': task.taskId,
                'wellwisherTasks.status': 'completed' // Only update if still completed
              },
              {
                $set: {
                  'wellwisherTasks.$.status': 'updating'
                }
              },
              {
                new: true,
                runValidators: true
              }
            );

            if (updateResult) {
              tasksMovedToUpdating++;
              
              const daysSinceCompletion = Math.floor(
                (today.getTime() - task.plantingDetails.completedAt.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              tasksDetails.push({
                orderId: order.orderId,
                taskId: task.taskId,
                completedAt: task.plantingDetails.completedAt,
                daysSinceCompletion
              });
              
              logger.info('Task moved to updating status for growth image upload', {
                orderId: order.orderId,
                taskId: task.taskId,
                completedAt: task.plantingDetails.completedAt,
                daysSinceCompletion
              });
            }
          } catch (updateError) {
            logger.error('Error updating task status to updating', {
              orderId: order.orderId,
              taskId: task.taskId,
              error: updateError
            });
          }
        }
      }
    }

    const result = {
      success: true,
      tasksMovedToUpdating,
      tasksDetails,
      checkedAt: today
    };

    logger.info('Quarterly (90-day) cron job completed', result);

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Error in quarterly (90-day) cron job', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute quarterly task cron job',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

