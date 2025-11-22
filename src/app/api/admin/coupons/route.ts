import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { auth } from '@/app/api/auth/[...nextauth]/route';

// GET - Fetch all coupons
export async function GET(_request: NextRequest) {
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

    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST - Create new coupon
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { code, category, discountPercentage, usageLimitType, totalUsageLimit, perUserUsageLimit } = body;

    // Validation
    if (!code || !category || !discountPercentage || !usageLimitType || !perUserUsageLimit) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    if (usageLimitType === 'custom' && (!totalUsageLimit || totalUsageLimit < 1)) {
      return NextResponse.json(
        { success: false, error: 'Total usage limit is required when usage limit type is custom' },
        { status: 400 }
      );
    }

    if (discountPercentage < 1 || discountPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Discount percentage must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    // Create coupon
    const couponData: {
      code: string;
      category: 'individual' | 'company';
      discountPercentage: number;
      usageLimitType: 'unlimited' | 'custom';
      perUserUsageLimit: number;
      usedCount: number;
      isActive: boolean;
      totalUsageLimit?: number;
    } = {
      code: code.toUpperCase().trim(),
      category,
      discountPercentage,
      usageLimitType,
      perUserUsageLimit,
      usedCount: 0,
      isActive: true
    };

    if (usageLimitType === 'custom') {
      couponData.totalUsageLimit = totalUsageLimit;
    }

    const coupon = await Coupon.create(couponData);

    return NextResponse.json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating coupon:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create coupon';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

