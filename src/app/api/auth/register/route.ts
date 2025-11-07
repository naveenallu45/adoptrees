import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations/auth';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import { sanitizeInput } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting for registration
    const rateLimitResult = await checkRateLimit(req, {
      maxRequests: 5, // 5 registration attempts per 15 minutes
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: String(err.path.join('.')),
        message: err.message,
      }));
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { userType, name, companyName, email, phone, password } = validationResult.data;

    await connectDB();

    // Check for existing user (case-insensitive)
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Hash password with appropriate cost factor
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      userType,
      name: userType === 'individual' && name ? sanitizeInput(name) : undefined,
      companyName: userType === 'company' && companyName ? sanitizeInput(companyName) : undefined,
      email: email.toLowerCase(),
      phone: phone ? sanitizeInput(phone) : undefined,
      passwordHash,
      role: 'user',
    });

    // Generate and store QR code for the user
    if (user.publicId) {
      try {
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://adoptrees.com';
        const qrUrl = `${origin}/u/${user.publicId}`;
        // Use same settings as modal (width: 320 for better quality)
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        // Update user with QR code
        user.qrCode = qrDataUrl;
        await user.save();
      } catch (qrError) {
        // Log error but don't fail registration if QR code generation fails
        console.error('Error generating QR code during registration:', qrError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user._id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (_err) {
    
    // Don't expose internal errors
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}


