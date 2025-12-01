import cron from 'node-cron';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import logger from '@/lib/logger';
import { sendMarketingEmail } from '@/lib/email';

let cronJobStarted = false;

/**
 * Cron job to send marketing emails to registered users
 * Runs daily at 4 AM UTC to send marketing emails to users who haven't received one in 10+ days
 */
export function startMarketingEmailCronJob() {
  // Prevent multiple initializations
  if (cronJobStarted) {
    logger.info('Marketing email cron job already started');
    return;
  }

  cronJobStarted = true;
  // Run daily at 4:00 AM UTC
  cron.schedule('0 4 * * *', async () => {
    try {
      await connectDB();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      // Calculate date 10 days ago
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);
      
      logger.info('Marketing email cron job executing', {
        today,
        tenDaysAgo,
        checkingFor: 'Users who haven\'t received marketing email in 10+ days'
      });
      
      // Find all users who:
      // 1. Are regular users (not admin or wellwisher)
      // 2. Haven't received a marketing email in the last 10 days (or never received one)
      // 3. Have a valid email address
      const usersToEmail = await User.find({
        role: 'user',
        email: { $exists: true, $ne: '' },
        $or: [
          { lastMarketingEmailSent: { $exists: false } }, // Never sent
          { lastMarketingEmailSent: { $lte: tenDaysAgo } } // Sent 10+ days ago
        ]
      }).select('email name userType lastMarketingEmailSent').limit(100); // Limit to 100 users per run to avoid overwhelming the email service
      
      logger.info('Marketing email cron job - users found', {
        count: usersToEmail.length,
        checkedAt: today
      });
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      // Send emails to eligible users
      for (const user of usersToEmail) {
        try {
          const displayName = user.name || user.companyName || '';
          const success = await sendMarketingEmail(
            user.email,
            displayName,
            user.userType
          );
          
          if (success) {
            // Update lastMarketingEmailSent timestamp
            user.lastMarketingEmailSent = new Date();
            await user.save();
            emailsSent++;
            
            logger.info('Marketing email sent successfully', {
              email: user.email,
              userType: user.userType,
              sentAt: new Date()
            });
          } else {
            emailsFailed++;
            logger.warn('Failed to send marketing email', {
              email: user.email,
              userType: user.userType
            });
          }
          
          // Add a small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        } catch (error) {
          emailsFailed++;
          logger.error('Error sending marketing email to user', {
            error: error instanceof Error ? error.message : String(error),
            email: user.email,
            userType: user.userType
          });
        }
      }
      
      logger.info('Marketing email cron job completed', {
        totalUsers: usersToEmail.length,
        emailsSent,
        emailsFailed,
        checkedAt: today
      });
      
    } catch (error) {
      logger.error('Error in marketing email cron job', error as Error);
    }
  }, {
    timezone: 'UTC'
  });

  logger.info('Marketing email cron job started - runs daily at 4:00 AM UTC');
}

// Auto-start cron job when module is imported (server-side only)
if (typeof window === 'undefined') {
  startMarketingEmailCronJob();
}

