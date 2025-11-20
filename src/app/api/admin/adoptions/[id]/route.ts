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

    // Find and delete the order
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Adoption not found' },
        { status: 404 }
      );
    }

    // Delete the order
    await Order.findByIdAndDelete(id);

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

