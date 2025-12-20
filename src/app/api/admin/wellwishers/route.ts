import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { wellWisherRegistrationSchema } from '@/lib/validations/wellwisher';
import { checkRateLimit, getClientIp, sanitizeInput, logSecurityEvent } from '@/lib/security';
import { sendWellWisherOnboardingEmail, sendWellWisherGreetingEmail } from '@/lib/email';

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
      .select('name email phone createdAt _id')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // OPTIMIZED: Calculate all task counts in a single aggregation pipeline
    // This replaces N*4 queries with a single query
    const wellWisherIds = wellWishers.map(ww => String(ww._id));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Single aggregation pipeline that calculates all counts for all well-wishers at once
    const taskStats = await Order.aggregate([
      {
        $match: {
          assignedWellwisher: { $in: wellWisherIds },
          wellwisherTasks: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$wellwisherTasks' },
      {
        $group: {
          _id: '$assignedWellwisher',
          upcomingTasks: {
            $sum: { $cond: [{ $eq: ['$wellwisherTasks.status', 'pending'] }, 1, 0] }
          },
          ongoingTasks: {
            $sum: { $cond: [{ $eq: ['$wellwisherTasks.status', 'in_progress'] }, 1, 0] }
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$wellwisherTasks.status', 'completed'] }, 1, 0] }
          },
          updatingTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$wellwisherTasks.status', 'completed'] },
                    { $ifNull: ['$wellwisherTasks.nextGrowthUpdateDue', false] },
                    { $lte: ['$wellwisherTasks.nextGrowthUpdateDue', today] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Create a map for quick lookup
    const statsMap = new Map(
      taskStats.map(stat => [stat._id, {
        upcomingTasks: stat.upcomingTasks || 0,
        ongoingTasks: stat.ongoingTasks || 0,
        completedTasks: stat.completedTasks || 0,
        updatingTasks: stat.updatingTasks || 0,
      }])
    );

    // Merge stats with well-wishers
    const wellWishersWithStats = wellWishers.map(wellWisher => ({
      ...wellWisher,
      ...(statsMap.get(String(wellWisher._id)) || {
        upcomingTasks: 0,
        ongoingTasks: 0,
        completedTasks: 0,
        updatingTasks: 0,
      })
    }));

    const response = NextResponse.json({
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

    return response;
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
      const errorMessages = validationResult.error.issues.map(err => err.message).join(', ');
      return NextResponse.json(
        { 
          success: false, 
          error: `Validation failed: ${errorMessages}`,
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
        { success: false, error: 'Well-wisher with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate publicId manually (same logic as registration)
    // This ensures well-wishers have publicId for certificates
    const generatePublicId = () => {
      const random = Math.random().toString(36).slice(2, 8);
      const timestamp = Date.now().toString(36).slice(-4);
      return `${random}${timestamp}`.toLowerCase();
    };
    
    // Ensure unique publicId
    let publicId = generatePublicId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await User.findOne({ publicId });
      if (!existing) break;
      publicId = generatePublicId();
      attempts++;
    }
    
    if (attempts >= 10) {
      return NextResponse.json(
        { success: false, error: 'Failed to create well-wisher. Please try again.' },
        { status: 500 }
      );
    }

    // Generate QR code for well-wisher (same as regular users)
    // QR codes are needed for certificates
    let qrDataUrl: string;
    try {
      // Always use production URL for QR codes
      const origin = 'https://adoptrees.com';
      const qrUrl = `${origin}/u/${publicId.toLowerCase()}`;
      qrDataUrl = await QRCode.toDataURL(qrUrl, { 
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      
      // Validate QR code was generated
      if (!qrDataUrl || qrDataUrl.trim() === '') {
        throw new Error('QR code generation returned empty result');
      }
    } catch (qrError) {
      console.error('Error generating QR code for well-wisher:', qrError);
      return NextResponse.json(
        { success: false, error: 'Failed to create well-wisher. Please try again.' },
        { status: 500 }
      );
    }

    // Create well-wisher with publicId and qrCode set from the start
    // This avoids issues with immutable fields and ensures certificates work
    const wellWisher = await User.create({
      name: sanitizeInput(name),
      email: email.toLowerCase(),
      phone: phone ? sanitizeInput(phone) : undefined,
      passwordHash,
      userType: 'individual', // Well-wishers are treated as individuals
      role: 'wellwisher',
      publicId, // Set explicitly to avoid pre-save hook issues
      qrCode: qrDataUrl, // Set from the start to avoid immutable field issues
    });

    // Verify publicId and QR code were saved
    const savedWellWisher = await User.findById(wellWisher._id).select('qrCode publicId').lean() as { qrCode?: string; publicId?: string } | null;
    if (!savedWellWisher || !savedWellWisher.publicId || savedWellWisher.publicId !== publicId) {
      console.error('Error: publicId mismatch after save for well-wisher');
      await User.findByIdAndDelete(wellWisher._id);
      return NextResponse.json(
        { success: false, error: 'Failed to create well-wisher. Please try again.' },
        { status: 500 }
      );
    }
    if (!savedWellWisher.qrCode || savedWellWisher.qrCode.trim() === '') {
      console.error('Error: QR code was not saved to database for well-wisher');
      await User.findByIdAndDelete(wellWisher._id);
      return NextResponse.json(
        { success: false, error: 'Failed to create well-wisher. Please try again.' },
        { status: 500 }
      );
    }

    // Log successful creation
    const ip = getClientIp(request);
    logSecurityEvent('WELLWISHER_CREATED', { 
      wellWisherId: wellWisher._id, 
      adminId: session.user.id 
    }, ip);

    // Send onboarding email with login details (don't fail if email fails)
    try {
      await sendWellWisherOnboardingEmail(wellWisher.email, wellWisher.name || '', password);
    } catch (emailError) {
      console.error('Error sending onboarding email:', emailError);
    }

    // Send greeting email (don't fail if email fails)
    try {
      await sendWellWisherGreetingEmail(wellWisher.email, wellWisher.name || '');
    } catch (emailError) {
      console.error('Error sending greeting email:', emailError);
    }

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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
