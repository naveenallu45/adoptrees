import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/api-auth';

/**
 * OPTIMIZED DELETE /api/admin/users/[id]
 * 
 * IMPROVEMENTS:
 * 1. Uses findByIdAndDelete() - single atomic operation
 * 2. Validates admin role before delete
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // OPTIMIZED: Use findByIdAndDelete with query to prevent admin deletion
    // This is atomic - checks role and deletes in one operation
    const deletedUser = await User.findOneAndDelete({
      _id: id,
      role: { $ne: 'admin' } // Prevent admin deletion
    });

    if (!deletedUser) {
      // Check if user exists but is admin
      const user = await User.findById(id).select('role').lean() as { role: string } | null;
      if (user && user.role === 'admin') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete admin users' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      data: { id: deletedUser._id }
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/**
 * OPTIMIZED GET /api/admin/users/[id]
 * 
 * IMPROVEMENTS:
 * 1. Already using .lean() and .select()
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // OPTIMIZED: Already using lean() and select()
    const user = await User.findById(id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

