import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { sendOTPEmail } from '@/lib/email';
import { z } from 'zod';

const requestOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/forgot-password
 * Request OTP for password reset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = requestOTPSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // Check if user exists (only for individual and company users, not admin or wellwisher)
    // IMPORTANT: We check user existence BEFORE generating OTP or sending email
    // to avoid unnecessary email sends and OTP generation for non-existent users
    const user = await User.findOne({
      email: normalizedEmail,
      role: 'user', // Only allow password reset for regular users
    }).lean();

    if (!user) {
      // User doesn't exist - return generic success message for security
      // (prevents email enumeration attacks - don't reveal if email exists)
      // NO EMAIL IS SENT for non-existent users
      // Set emailSent to false so frontend doesn't proceed to OTP step
      return NextResponse.json({
        success: true,
        emailSent: false, // Flag to indicate email was not sent (user doesn't exist)
        message: 'If an account exists with this email, an OTP has been sent.',
      });
    }

    // User exists - proceed with OTP generation and email sending
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Create new OTP
    await OTP.create({
      email: normalizedEmail,
      otp,
      expiresAt,
      verified: false,
    });

    // Send OTP email ONLY if user exists
    const emailSent = await sendOTPEmail(normalizedEmail, otp);

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true, // Flag to indicate email was successfully sent
      message: 'OTP has been sent to your email address.',
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

