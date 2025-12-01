import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import { sendMarketingEmail } from '@/lib/email';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const sendMarketingEmailSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  userType: z.enum(['all', 'individual', 'company']).optional().default('all'),
  adoptionStatus: z.enum(['all', 'adopted', 'nonAdopted']).optional().default('all'),
  limit: z.number().min(1).max(1000).optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const validationResult = sendMarketingEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { templateId, userType, adoptionStatus, limit } = validationResult.data;

    // Build base query for users
    const query: Record<string, unknown> = {
      role: 'user',
    };

    if (userType !== 'all') {
      query.userType = userType;
    }

    // Apply adoption status filter using orders
    if (adoptionStatus && adoptionStatus !== 'all') {
      // Find all user emails with at least one paid, non-cancelled order
      const adoptedUserEmails: string[] = await Order.distinct('userEmail', {
        paymentStatus: 'paid',
        status: { $ne: 'cancelled' },
      });

      if (adoptionStatus === 'adopted') {
        query.email = { $in: adoptedUserEmails };
      } else if (adoptionStatus === 'nonAdopted') {
        query.email = { $nin: adoptedUserEmails };
      }
    } else {
      // Default email condition when not filtering by adoption status
      query.email = { $exists: true, $ne: '' };
    }

    // Find users to send emails to
    const users = await User.find(query)
      .select('email name companyName userType lastMarketingEmailSent')
      .limit(limit);

    let emailsSent = 0;
    let emailsFailed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Send emails to users
    for (const user of users) {
      try {
        const displayName = user.name || user.companyName || '';
        const success = await sendMarketingEmail(
          user.email,
          displayName,
          user.userType,
          templateId
        );

        if (success) {
          // Update lastMarketingEmailSent timestamp
          user.lastMarketingEmailSent = new Date();
          await user.save();
          emailsSent++;
        } else {
          emailsFailed++;
          errors.push({ email: user.email, error: 'Email sending failed' });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        emailsFailed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ email: user.email, error: errorMessage });
        logError('Error sending marketing email to user', error as Error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Marketing emails sent successfully`,
      data: {
        totalUsers: users.length,
        emailsSent,
        emailsFailed,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    });

  } catch (error) {
    logError('Error in admin marketing email send', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send marketing emails',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Get marketing email statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') || 'all';

    // Build query
    const query: Record<string, unknown> = {
      role: 'user',
      email: { $exists: true, $ne: '' }
    };

    if (userType !== 'all') {
      query.userType = userType;
    }

    // Get total users
    const totalUsers = await User.countDocuments(query);

    // Get users who have received marketing emails
    const usersWithEmails = await User.countDocuments({
      ...query,
      lastMarketingEmailSent: { $exists: true }
    });

    // Get users who haven't received emails
    const usersWithoutEmails = totalUsers - usersWithEmails;

    // Get most recent marketing email sent date
    const mostRecentEmail = await User.findOne({
      ...query,
      lastMarketingEmailSent: { $exists: true }
    })
      .sort({ lastMarketingEmailSent: -1 })
      .select('lastMarketingEmailSent');

    // Get users by type
    const individualUsers = await User.countDocuments({ ...query, userType: 'individual' });
    const companyUsers = await User.countDocuments({ ...query, userType: 'company' });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        usersWithEmails,
        usersWithoutEmails,
        individualUsers,
        companyUsers,
        lastMarketingEmailSent: mostRecentEmail?.lastMarketingEmailSent || null
      }
    });

  } catch (error) {
    logError('Error fetching marketing email statistics', error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch marketing email statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

