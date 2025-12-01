import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import logger from '@/lib/logger';
import { sendMarketingEmail } from '@/lib/email';

/**
 * Vercel Cron Job: Marketing Emails
 * Runs daily at 4:00 AM UTC
 * Sends marketing emails to users who haven't received one in 10+ days
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
    }).select('email name companyName userType lastMarketingEmailSent').limit(50); // Limit to 50 users per run to stay within 300s timeout
    
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
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay (reduced to stay within timeout)
      } catch (error) {
        emailsFailed++;
        logger.error('Error sending marketing email to user', {
          error: error instanceof Error ? error.message : String(error),
          email: user.email,
          userType: user.userType
        });
      }
    }
    
    const result = {
      success: true,
      totalUsers: usersToEmail.length,
      emailsSent,
      emailsFailed,
      checkedAt: today
    };
    
    logger.info('Marketing email cron job completed', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Error in marketing email cron job', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute marketing email cron job',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

