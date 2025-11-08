import cron from 'node-cron';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import logger from '@/lib/logger';

let cronJobStarted = false;

/**
 * Cron job to check for completed tasks that need growth updates
 * Runs daily at 2 AM to check for tasks where nextGrowthUpdateDue <= today
 */
export function startGrowthUpdateCronJob() {
  // Prevent multiple initializations
  if (cronJobStarted) {
    logger.info('Growth update cron job already started');
    return;
  }

  cronJobStarted = true;
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
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
            
            // Log the task that needs update
            logger.info('Task needs growth update', {
              orderId: order.orderId,
              taskId: task.taskId,
              completedAt: task.plantingDetails.completedAt,
              nextGrowthUpdateDue: task.nextGrowthUpdateDue,
              daysSinceCompletion: Math.floor(
                (today.getTime() - task.plantingDetails.completedAt.getTime()) / (1000 * 60 * 60 * 24)
              )
            });
          }
        }
      }

      logger.info('Growth update cron job completed', {
        tasksNeedingUpdate,
        checkedAt: new Date()
      });

    } catch (error) {
      logger.error('Error in growth update cron job', error as Error);
    }
  }, {
    timezone: 'UTC'
  });

  logger.info('Growth update cron job started - runs daily at 2:00 AM UTC');
}

// Auto-start cron job when module is imported (server-side only)
if (typeof window === 'undefined') {
  startGrowthUpdateCronJob();
}

