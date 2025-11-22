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
    const { code, category, discountPercentage, usageLimitType, totalUsageLimit, perUserUsageLimit, isActive } = body;

    // Find coupon
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Validation
    if (code && code !== coupon.code) {
      // Check if new code already exists
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim(), _id: { $ne: id } });
      if (existingCoupon) {
        return NextResponse.json(
          { success: false, error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
      coupon.code = code.toUpperCase().trim();
    }

    if (category) coupon.category = category;
    if (discountPercentage !== undefined) {
      if (discountPercentage < 1 || discountPercentage > 100) {
        return NextResponse.json(
          { success: false, error: 'Discount percentage must be between 1 and 100' },
          { status: 400 }
        );
      }
      coupon.discountPercentage = discountPercentage;
    }
    if (usageLimitType) {
      coupon.usageLimitType = usageLimitType;
      if (usageLimitType === 'custom') {
        if (!totalUsageLimit || totalUsageLimit < 1) {
          return NextResponse.json(
            { success: false, error: 'Total usage limit is required when usage limit type is custom' },
            { status: 400 }
          );
        }
        coupon.totalUsageLimit = totalUsageLimit;
      } else {
        coupon.totalUsageLimit = undefined;
      }
    }
    if (perUserUsageLimit !== undefined) {
      if (perUserUsageLimit < 1) {
        return NextResponse.json(
          { success: false, error: 'Per user usage limit must be at least 1' },
          { status: 400 }
        );
      }
      coupon.perUserUsageLimit = perUserUsageLimit;
    }
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    return NextResponse.json({
      success: true,
      data: coupon,
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

