import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import logger from '@/lib/logger';

/**
 * Vercel Cron Job: Growth Updates Check
 * Runs daily at 2:00 AM UTC
 * Checks for completed tasks that need growth updates
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
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find all completed tasks where nextGrowthUpdateDue is today or in the past
    const orders = await Order.find({
      'wellwisherTasks.status': 'completed',
      'wellwisherTasks.nextGrowthUpdateDue': { $lte: today }
    });

    let tasksNeedingUpdate = 0;
    const tasksDetails: Array<{
      orderId: string;
      taskId: string;
      completedAt: Date;
      nextGrowthUpdateDue: Date;
      daysSinceCompletion: number;
    }> = [];

    for (const order of orders) {
      if (!order.wellwisherTasks) continue;

      for (const task of order.wellwisherTasks) {
        if (
          task.status === 'completed' &&
          task.nextGrowthUpdateDue &&
          task.nextGrowthUpdateDue <= today &&
          task.plantingDetails?.completedAt
        ) {
          tasksNeedingUpdate++;
          
          const daysSinceCompletion = Math.floor(
            (today.getTime() - task.plantingDetails.completedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          tasksDetails.push({
            orderId: order.orderId,
            taskId: task.taskId,
            completedAt: task.plantingDetails.completedAt,
            nextGrowthUpdateDue: task.nextGrowthUpdateDue,
            daysSinceCompletion
          });
          
          // Log the task that needs update
          logger.info('Task needs growth update', {
            orderId: order.orderId,
            taskId: task.taskId,
            completedAt: task.plantingDetails.completedAt,
            nextGrowthUpdateDue: task.nextGrowthUpdateDue,
            daysSinceCompletion
          });
        }
      }
    }

    const result = {
      success: true,
      tasksNeedingUpdate,
      tasksDetails,
      checkedAt: new Date()
    };

    logger.info('Growth update cron job completed', result);

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Error in growth update cron job', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute growth update cron job',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

