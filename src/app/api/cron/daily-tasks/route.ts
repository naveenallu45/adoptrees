import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import logger from '@/lib/logger';
import { sendMarketingEmail } from '@/lib/email';

/**
 * Vercel Cron Job: Daily Tasks (Unified)
 * Runs daily at 3:00 AM UTC
 * Executes all daily cron tasks:
 * 1. Growth Updates Check
 * 2. Quarterly Task (90-day) Updates
 * 3. Marketing Emails
 */
export async function GET(request: NextRequest) {
  // Verify this is a Vercel Cron request
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

  const results = {
    growthUpdates: { success: false, tasksNeedingUpdate: 0, error: null as string | null },
    quarterlyTask: { success: false, tasksMovedToUpdating: 0, error: null as string | null },
    marketingEmails: { success: false, emailsSent: 0, emailsFailed: 0, totalUsers: 0, error: null as string | null }
  };

  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ============================================
    // TASK 1: Growth Updates Check
    // ============================================
    try {
      logger.info('Daily cron: Starting growth updates check');
      
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
            logger.info('Task needs growth update', {
              orderId: order.orderId,
              taskId: task.taskId
            });
          }
        }
      }

      results.growthUpdates = {
        success: true,
        tasksNeedingUpdate,
        error: null
      };
      logger.info('Daily cron: Growth updates check completed', results.growthUpdates);
    } catch (error) {
      results.growthUpdates.error = error instanceof Error ? error.message : String(error);
      logger.error('Daily cron: Error in growth updates check', error as Error);
    }

    // ============================================
    // TASK 2: Quarterly Task (90-day) Updates
    // ============================================
    try {
      logger.info('Daily cron: Starting quarterly task updates');
      
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0);
      
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
            try {
              const updateResult = await Order.findOneAndUpdate(
                {
                  _id: order._id,
                  'wellwisherTasks.taskId': task.taskId,
                  'wellwisherTasks.status': 'completed'
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
                logger.info('Task moved to updating status', {
                  orderId: order.orderId,
                  taskId: task.taskId
                });
              }
            } catch (updateError) {
              logger.error('Error updating task status', {
                orderId: order.orderId,
                taskId: task.taskId,
                error: updateError
              });
            }
          }
        }
      }

      results.quarterlyTask = {
        success: true,
        tasksMovedToUpdating,
        error: null
      };
      logger.info('Daily cron: Quarterly task updates completed', results.quarterlyTask);
    } catch (error) {
      results.quarterlyTask.error = error instanceof Error ? error.message : String(error);
      logger.error('Daily cron: Error in quarterly task updates', error as Error);
    }

    // ============================================
    // TASK 3: Marketing Emails
    // ============================================
    try {
      logger.info('Daily cron: Starting marketing emails');
      
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);
      
      const usersToEmail = await User.find({
        role: 'user',
        email: { $exists: true, $ne: '' },
        $or: [
          { lastMarketingEmailSent: { $exists: false } },
          { lastMarketingEmailSent: { $lte: tenDaysAgo } }
        ]
      }).select('email name companyName userType lastMarketingEmailSent').limit(50);
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      for (const user of usersToEmail) {
        try {
          const displayName = user.name || user.companyName || '';
          const success = await sendMarketingEmail(
            user.email,
            displayName,
            user.userType
          );
          
          if (success) {
            user.lastMarketingEmailSent = new Date();
            await user.save();
            emailsSent++;
          } else {
            emailsFailed++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          emailsFailed++;
          logger.error('Error sending marketing email to user', {
            error: error instanceof Error ? error.message : String(error),
            email: user.email
          });
        }
      }

      results.marketingEmails = {
        success: true,
        emailsSent,
        emailsFailed,
        totalUsers: usersToEmail.length,
        error: null
      };
      logger.info('Daily cron: Marketing emails completed', results.marketingEmails);
    } catch (error) {
      results.marketingEmails.error = error instanceof Error ? error.message : String(error);
      logger.error('Daily cron: Error in marketing emails', error as Error);
    }

    // Return combined results
    const allSuccess = results.growthUpdates.success && 
                       results.quarterlyTask.success && 
                       results.marketingEmails.success;

    return NextResponse.json({
      success: allSuccess,
      executedAt: new Date(),
      results
    });

  } catch (error) {
    logger.error('Daily cron: Fatal error', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute daily cron tasks',
        details: error instanceof Error ? error.message : String(error),
        partialResults: results
      },
      { status: 500 }
    );
  }
}

