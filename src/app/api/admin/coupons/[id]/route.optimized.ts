import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { requireAdmin } from '@/lib/api-auth';

/**
 * OPTIMIZED PUT /api/admin/coupons/[id]
 * 
 * IMPROVEMENTS:
 * 1. Uses findByIdAndUpdate() - single atomic operation
 * 2. Returns updated document immediately
 * 3. Validates before update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { code, category, discountPercentage, usageLimitType, totalUsageLimit, perUserUsageLimit, isActive } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (code) {
      // Check if new code already exists
      const existingCoupon = await Coupon.findOne({ 
        code: code.toUpperCase().trim(), 
        _id: { $ne: id } 
      }).lean();
      
      if (existingCoupon) {
        return NextResponse.json(
          { success: false, error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
      updateData.code = code.toUpperCase().trim();
    }
    
    if (category) updateData.category = category;
    if (discountPercentage !== undefined) {
      if (discountPercentage < 1 || discountPercentage > 100) {
        return NextResponse.json(
          { success: false, error: 'Discount percentage must be between 1 and 100' },
          { status: 400 }
        );
      }
      updateData.discountPercentage = discountPercentage;
    }
    if (usageLimitType) {
      updateData.usageLimitType = usageLimitType;
      if (usageLimitType === 'custom') {
        if (!totalUsageLimit || totalUsageLimit < 1) {
          return NextResponse.json(
            { success: false, error: 'Total usage limit is required when usage limit type is custom' },
            { status: 400 }
          );
        }
        updateData.totalUsageLimit = totalUsageLimit;
      } else {
        updateData.$unset = { totalUsageLimit: '' };
      }
    }
    if (perUserUsageLimit !== undefined) {
      if (perUserUsageLimit < 1) {
        return NextResponse.json(
          { success: false, error: 'Per user usage limit must be at least 1' },
          { status: 400 }
        );
      }
      updateData.perUserUsageLimit = perUserUsageLimit;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    // OPTIMIZED: Use findByIdAndUpdate - single atomic operation
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true,           // Return updated document
        runValidators: true  // Run schema validators
      }
    );

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: coupon.toObject(),
      message: 'Coupon updated successfully'
    });
  } catch (error: unknown) {
    console.error('Error updating coupon:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

/**
 * OPTIMIZED DELETE /api/admin/coupons/[id]
 * 
 * IMPROVEMENTS:
 * 1. Uses findByIdAndDelete() - single atomic operation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon ID' },
        { status: 400 }
      );
    }

    // OPTIMIZED: Use findByIdAndDelete - single atomic operation
    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    
    if (!deletedCoupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully',
      data: { id: deletedCoupon._id }
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

