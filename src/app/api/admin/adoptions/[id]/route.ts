import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/api-auth';
import mongoose from 'mongoose';

/**
 * DELETE /api/admin/adoptions/[id]
 * Delete an adoption/order by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid adoption ID format' },
        { status: 400 }
      );
    }

    await connectDB();

    // OPTIMIZED: Use findByIdAndDelete - single atomic operation
    const order = await Order.findByIdAndDelete(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Adoption not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Adoption deleted successfully',
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete adoption' },
      { status: 500 }
    );
  }
}

