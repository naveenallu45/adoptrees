import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/api-auth';

/**
 * OPTIMIZED GET /api/admin/users?type=individual|company
 * 
 * IMPROVEMENTS:
 * 1. Added pagination support
 * 2. Already using .lean() and .select()
 * 3. Uses indexes: userType, role, createdAt (should be added to User model)
 * 4. Returns pagination metadata
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    if (!type || !['individual', 'company'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing user type parameter' },
        { status: 400 }
      );
    }

    // Build query - should use indexes on userType and role
    const query = { 
      userType: type, 
      role: 'user' // Only regular users, exclude admin and wellwisher roles
    };

    // Get total count (uses indexes)
    const totalCount = await User.countDocuments(query);

    // OPTIMIZED: Fetch paginated results
    // .select('-passwordHash') excludes password field
    // .lean() returns plain JS objects
    // Uses indexes: userType, role, createdAt (for sort)
    const users = await User.find(query)
      .select('-passwordHash') // Exclude password hash
      .sort({ createdAt: -1 }) // Uses createdAt index
      .skip(skip)
      .limit(limit)
      .lean(); // Returns plain JS objects, not Mongoose documents

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

