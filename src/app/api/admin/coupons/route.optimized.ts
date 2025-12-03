import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { requireAdmin } from '@/lib/api-auth';

/**
 * OPTIMIZED GET /api/admin/coupons
 * 
 * IMPROVEMENTS:
 * 1. Added pagination support
 * 2. Uses .lean() for performance
 * 3. Uses indexes: category, isActive (already defined in Coupon model)
 * 4. Returns pagination metadata
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    // Optional filters
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Build query - uses compound index on category + isActive
    const query: Record<string, unknown> = {};
    
    if (category && ['individual', 'company'].includes(category)) {
      query.category = category;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    // Get total count (uses index)
    const totalCount = await Coupon.countDocuments(query);

    // Fetch paginated results with lean()
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() // Returns plain JS objects
      .exec();

    return NextResponse.json({
      success: true,
      data: coupons,
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
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

/**
 * OPTIMIZED POST /api/admin/coupons
 * 
 * IMPROVEMENTS:
 * 1. Uses Coupon.create() - optimized for single document creation
 * 2. Returns created document with lean() conversion
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
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

    // Check if coupon code already exists (uses unique index on code)
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() }).lean();
    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    // OPTIMIZED: Use Coupon.create() - optimized for single document
    const couponData = {
      code: code.toUpperCase().trim(),
      category,
      discountPercentage,
      usageLimitType,
      perUserUsageLimit,
      usedCount: 0,
      isActive: true,
      ...(usageLimitType === 'custom' && { totalUsageLimit })
    };

    const coupon = await Coupon.create(couponData);

    // Convert to plain object for response
    const couponObj = coupon.toObject();

    return NextResponse.json({
      success: true,
      data: couponObj,
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

    return NextResponse.json(
      { success: false, error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

