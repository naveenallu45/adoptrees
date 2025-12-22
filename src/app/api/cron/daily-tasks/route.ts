import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import logger from '@/lib/logger';
import { sendMarketingEmail } from '@/lib/email';
import { reconcileAllInconsistentOrders } from '@/lib/payment-reconciliation';

/**
 * Vercel Cron Job: Daily Tasks (Unified)
 * Runs daily at 3:00 AM UTC
 * Executes all daily cron tasks:
 * 1. Growth Updates Check
 * 2. Quarterly Task (90-day) Updates
 * 3. Marketing Emails
 * 4. Pending Orders Cleanup (cancels orders pending > 7 days)
 * 5. Payment Reconciliation (fixes inconsistent payment states)
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
    marketingEmails: { success: false, emailsSent: 0, emailsFailed: 0, totalUsers: 0, error: null as string | null },
    pendingOrdersCleanup: { success: false, ordersCancelled: 0, error: null as string | null },
    paymentReconciliation: { success: false, totalChecked: 0, reconciled: 0, errors: 0, error: null as string | null }
  };

  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ============================================
    // TASK 1: Growth Updates Check (Read-only, fast)
    // ============================================
    try {
      logger.info('Daily cron: Starting growth updates check');
      
      // Use count query first - much faster than fetching all documents
      const ordersCount = await Order.countDocuments({
        'wellwisherTasks.status': 'completed',
        'wellwisherTasks.nextGrowthUpdateDue': { $lte: today }
      });

      let tasksNeedingUpdate = 0;
      
      // Only fetch if there are orders to check
      if (ordersCount > 0) {
        const orders = await Order.find({
          'wellwisherTasks.status': 'completed',
          'wellwisherTasks.nextGrowthUpdateDue': { $lte: today }
        }).select('orderId wellwisherTasks').limit(100); // Limit to avoid timeout

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
            }
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
    // TASK 2: Quarterly Task (90-day) Updates (Optimized - batch updates)
    // ============================================
    try {
      logger.info('Daily cron: Starting quarterly task updates');
      
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0);
      
      // First check if there are any orders to update
      const ordersCount = await Order.countDocuments({
        'wellwisherTasks.status': 'completed',
        'wellwisherTasks.plantingDetails.completedAt': { $lte: ninetyDaysAgo }
      });

      let tasksMovedToUpdating = 0;
      
      if (ordersCount > 0) {
        const orders = await Order.find({
          'wellwisherTasks.status': 'completed',
          'wellwisherTasks.plantingDetails.completedAt': { $lte: ninetyDaysAgo }
        }).select('_id orderId wellwisherTasks').limit(50); // Limit to avoid timeout

        // Process in parallel batches
        const updatePromises: Promise<void>[] = [];
        
        for (const order of orders) {
          if (!order.wellwisherTasks) continue;
          for (const task of order.wellwisherTasks) {
            if (
              task.status === 'completed' &&
              task.plantingDetails?.completedAt &&
              task.plantingDetails.completedAt <= ninetyDaysAgo
            ) {
              updatePromises.push(
                Order.findOneAndUpdate(
                  {
                    _id: order._id,
                    'wellwisherTasks.taskId': task.taskId,
                    'wellwisherTasks.status': 'completed'
                  },
                  {
                    $set: {
                      'wellwisherTasks.$.status': 'updating'
                    }
                  }
                ).then((updateResult) => {
                  if (updateResult) {
                    tasksMovedToUpdating++;
                  }
                }).catch((updateError) => {
                  logger.error('Error updating task status', {
                    orderId: order.orderId,
                    taskId: task.taskId,
                    error: updateError
                  });
                })
              );
            }
          }
        }
        
        // Wait for all updates to complete (in batches of 10)
        const batchSize = 10;
        for (let i = 0; i < updatePromises.length; i += batchSize) {
          await Promise.all(updatePromises.slice(i, i + batchSize));
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
    // TASK 3: Marketing Emails (Optimized - reduced batch size)
    // ============================================
    try {
      logger.info('Daily cron: Starting marketing emails');
      
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);
      
      // Reduced limit to stay within cron execution time
      const usersToEmail = await User.find({
        role: 'user',
        email: { $exists: true, $ne: '' },
        $or: [
          { lastMarketingEmailSent: { $exists: false } },
          { lastMarketingEmailSent: { $lte: tenDaysAgo } }
        ]
      }).select('email name companyName userType lastMarketingEmailSent').limit(25); // Reduced from 50 to 25
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      // Process emails in parallel batches to reduce execution time
      const emailBatchSize = 5;
      for (let i = 0; i < usersToEmail.length; i += emailBatchSize) {
        const batch = usersToEmail.slice(i, i + emailBatchSize);
        
        await Promise.all(batch.map(async (user) => {
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
          } catch (error) {
            emailsFailed++;
            logger.error('Error sending marketing email to user', {
              error: error instanceof Error ? error.message : String(error),
              email: user.email
            });
          }
        }));
        
        // Small delay between batches to avoid rate limiting
        if (i + emailBatchSize < usersToEmail.length) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay
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

    // ============================================
    // TASK 4: Cleanup Old Pending Orders (Optimized - bulk update)
    // ============================================
    try {
      logger.info('Daily cron: Starting pending orders cleanup');
      
      // Cancel pending orders older than 7 days (168 hours)
      // These are likely abandoned orders where user never completed payment
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      // Check count first - skip if no orders to update
      const pendingCount = await Order.countDocuments({
        paymentStatus: 'pending',
        status: 'pending',
        createdAt: { $lt: sevenDaysAgo }
      });
      
      let ordersCancelled = 0;
      
      if (pendingCount > 0) {
        // Use bulk update for better performance
        const updateResult = await Order.updateMany(
          {
            paymentStatus: 'pending',
            status: 'pending',
            createdAt: { $lt: sevenDaysAgo }
          },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'cancelled'
            }
          }
        );
        
        ordersCancelled = updateResult.modifiedCount;
        
        if (ordersCancelled > 0) {
          logger.info('Cancelled old pending orders', {
            count: ordersCancelled,
            cutoffDate: sevenDaysAgo
          });
        }
      }
      
      results.pendingOrdersCleanup = {
        success: true,
        ordersCancelled,
        error: null
      };
      logger.info('Daily cron: Pending orders cleanup completed', results.pendingOrdersCleanup);
    } catch (error) {
      results.pendingOrdersCleanup.error = error instanceof Error ? error.message : String(error);
      logger.error('Daily cron: Error in pending orders cleanup', error as Error);
    }

    // ============================================
    // TASK 5: Payment Reconciliation (Optimized - limited batch)
    // ============================================
    try {
      logger.info('Daily cron: Starting payment reconciliation');
      
      // Limit to 20 orders per run to stay within execution time limits
      // This will process all orders over multiple days
      const reconciliationResult = await reconcileAllInconsistentOrders(20);
      
      results.paymentReconciliation = {
        success: true,
        totalChecked: reconciliationResult.totalChecked,
        reconciled: reconciliationResult.reconciled,
        errors: reconciliationResult.errors,
        error: null
      };
      
      logger.info('Daily cron: Payment reconciliation completed', {
        totalChecked: reconciliationResult.totalChecked,
        reconciled: reconciliationResult.reconciled,
        errors: reconciliationResult.errors
      });
      
      // Log details of reconciled orders (only if there are any)
      if (reconciliationResult.details.length > 0) {
        logger.info('Payment reconciliation details', {
          details: reconciliationResult.details
        });
      }
    } catch (error) {
      results.paymentReconciliation.error = error instanceof Error ? error.message : String(error);
      logger.error('Daily cron: Error in payment reconciliation', error as Error);
    }

    // Return combined results
    const allSuccess = results.growthUpdates.success && 
                       results.quarterlyTask.success && 
                       results.marketingEmails.success &&
                       results.pendingOrdersCleanup.success &&
                       results.paymentReconciliation.success;

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

