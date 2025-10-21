import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations/auth';
// import { checkRateLimit } from '@/lib/api-auth'; // Commented out - rate limiting disabled

export async function POST(req: NextRequest) {
  try {
    // Rate limiting disabled for unlimited attempts
    // Uncomment below to enable rate limiting if needed
    // const rateLimitResult = checkRateLimit(req, {
    //   maxRequests: 100,
    //   windowMs: 15 * 60 * 1000,
    // });
    // if (!rateLimitResult.allowed) {
    //   return rateLimitResult.response;
    // }

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
      name: userType === 'individual' ? name : undefined,
      companyName: userType === 'company' ? companyName : undefined,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: 'user',
    });

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
  } catch (err) {
    console.error('Registration error:', err);
    
    // Don't expose internal errors
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}


