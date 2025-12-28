import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/users?type=individual|company|dealer
 * Fetch users by type
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default to 1000 for admin
    const skip = (page - 1) * limit;
    const usePagination = searchParams.get('paginate') === 'true';

    if (!type || !['individual', 'company', 'dealer'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing user type parameter' },
        { status: 400 }
      );
    }

    const query = { 
      userType: type, 
      role: 'user' // Only regular users, exclude admin and wellwisher roles
    };

    if (usePagination) {
      // Paginated query
      const totalCount = await User.countDocuments(query);
      
      const users = await User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        data: users,
        count: users.length,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } else {
      // Non-paginated query (for admin dashboard stats)
      const users = await User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: users,
        count: users.length,
      });
    }
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

