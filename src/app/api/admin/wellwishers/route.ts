import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { wellWisherRegistrationSchema } from '@/lib/validations/wellwisher';
import { checkRateLimit, getClientIp, sanitizeInput, logSecurityEvent } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== 'admin') {
      const ip = getClientIp(request);
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { endpoint: 'GET /api/admin/wellwishers' }, ip);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 per page
    const search = searchParams.get('search') || '';

    // Build query
    const query: { role: string; $or?: Array<{ [key: string]: { $regex: string; $options: string } }> } = { role: 'wellwisher' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Get well-wishers with pagination
    const wellWishers = await User.find(query)
      .select('name email phone createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // For now, return mock task counts since we don't have a task system yet
    const wellWishersWithStats = wellWishers.map(wellWisher => ({
      ...wellWisher.toObject(),
      upcomingTasks: Math.floor(Math.random() * 10),
      ongoingTasks: Math.floor(Math.random() * 5),
      completedTasks: Math.floor(Math.random() * 20),
      updatingTasks: Math.floor(Math.random() * 3),
    }));

    return NextResponse.json({
      success: true,
      data: wellWishersWithStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitCheck = checkRateLimit(request, { maxRequests: 10, windowMs: 60000 }); // 10 requests per minute
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const session = await auth();
    
    if (!session || session.user?.role !== 'admin') {
      const ip = getClientIp(request);
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { endpoint: 'POST /api/admin/wellwishers' }, ip);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input with schema
    const validationResult = wellWisherRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors: validationResult.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validationResult.data;

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Well-wisher with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create well-wisher
    const wellWisher = new User({
      name: sanitizeInput(name),
      email: email.toLowerCase(),
      phone: phone ? sanitizeInput(phone) : undefined,
      passwordHash,
      userType: 'individual', // Well-wishers are treated as individuals
      role: 'wellwisher',
    });

    await wellWisher.save();

    // Log successful creation
    const ip = getClientIp(request);
    logSecurityEvent('WELLWISHER_CREATED', { 
      wellWisherId: wellWisher._id, 
      adminId: session.user.id 
    }, ip);

    return NextResponse.json({
      success: true,
      message: 'Well-wisher registered successfully',
      data: {
        _id: wellWisher._id,
        name: wellWisher.name,
        email: wellWisher.email,
        phone: wellWisher.phone,
        role: wellWisher.role,
        createdAt: wellWisher.createdAt,
      },
    });
  } catch (_error) {
    if (process.env.NODE_ENV === 'development') {
    }
    const ip = getClientIp(request);
    logSecurityEvent('WELLWISHER_CREATION_ERROR', { error: _error instanceof Error ? _error.message : 'Unknown error' }, ip);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
