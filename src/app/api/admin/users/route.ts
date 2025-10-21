import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/users?type=individual|company
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

    if (!type || !['individual', 'company'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing user type parameter' },
        { status: 400 }
      );
    }

    // Fetch users by type, exclude password hash
    const users = await User.find({ userType: type, role: 'user' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

