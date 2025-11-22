import cron from 'node-cron';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import logger from '@/lib/logger';

let cronJobStarted = false;

/**
 * Cron job that runs daily to move completed tasks to 'updating' status
 * after 90 days since completion, allowing well-wishers to upload growth images
 */
export function startQuarterlyCronJob() {
  // Prevent multiple initializations
  if (cronJobStarted) {
    logger.info('Quarterly (90-day) cron job already started');
    return;
  }

  cronJobStarted = true;
  
  // Run daily at 3:00 AM UTC to check for tasks that need to be moved to updating
  cron.schedule('0 3 * * *', async () => {
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
                logger.info('Task moved to updating status for growth image upload', {
                  orderId: order.orderId,
                  taskId: task.taskId,
                  completedAt: task.plantingDetails.completedAt,
                  daysSinceCompletion: Math.floor(
                    (today.getTime() - task.plantingDetails.completedAt.getTime()) / (1000 * 60 * 60 * 24)
                  )
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

      logger.info('Quarterly (90-day) cron job completed', {
        tasksMovedToUpdating,
        checkedAt: today
      });

    } catch (error) {
      logger.error('Error in quarterly (90-day) cron job', error as Error);
    }
  }, {
    timezone: 'UTC'
  });

  logger.info('Quarterly (90-day) cron job started - runs daily at 3:00 AM UTC to move completed tasks to updating after 90 days');
}

// Auto-start cron job when module is imported (server-side only)
if (typeof window === 'undefined') {
  startQuarterlyCronJob();
}

