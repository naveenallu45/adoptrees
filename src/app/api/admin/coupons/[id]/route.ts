import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { auth } from '@/app/api/auth/[...nextauth]/route';


// PUT - Update coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { code, category, discountPercentage, usageLimitType, totalUsageLimit, perUserUsageLimit, isActive, isHidden } = body;

    // OPTIMIZED: Build update object first, then use findByIdAndUpdate
    const updateData: Record<string, unknown> = {};

    // Check if code is being changed and validate uniqueness
    if (code) {
      const normalizedCode = code.toUpperCase().trim();
      // Check if new code already exists (only if code is being changed)
      const existingCoupon = await Coupon.findById(id).select('code').lean() as { code: string } | null;
      if (!existingCoupon) {
        return NextResponse.json(
          { success: false, error: 'Coupon not found' },
          { status: 404 }
        );
      }
      
      if (normalizedCode !== existingCoupon.code) {
        const codeExists = await Coupon.findOne({ code: normalizedCode, _id: { $ne: id } });
        if (codeExists) {
          return NextResponse.json(
            { success: false, error: 'Coupon code already exists' },
            { status: 400 }
          );
        }
        updateData.code = normalizedCode;
      }
    }

    // Validate and build update object
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
        updateData.totalUsageLimit = undefined;
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
    
    // Always update isHidden if provided (handles both true and false)
    // This ensures the field is updated even when setting it to false
    if (isHidden !== undefined) {
      updateData.isHidden = Boolean(isHidden);
    }

    // OPTIMIZED: Use findByIdAndUpdate instead of find + save
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Convert Mongoose document to plain object to ensure all fields are included
    const couponData = coupon.toObject ? coupon.toObject() : JSON.parse(JSON.stringify(coupon));
    
    return NextResponse.json({
      success: true,
      data: couponData,
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

    const errorMessage = error instanceof Error ? error.message : 'Failed to update coupon';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

