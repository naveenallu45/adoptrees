import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { auth } from '@/lib/auth-server';

// GET - Fetch all coupons
export async function GET(request: NextRequest) {
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

    // Parse pagination params (optional)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default to 1000 for admin
    const skip = (page - 1) * limit;
    const usePagination = searchParams.get('paginate') === 'true';

    if (usePagination) {
      // Paginated query
      const totalCount = await Coupon.countDocuments({});
      
      const coupons = await Coupon.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Ensure usedCount is included and has a default value if missing
      const couponsWithUsedCount = coupons.map(coupon => ({
        ...coupon,
        usedCount: coupon.usedCount !== undefined && coupon.usedCount !== null ? coupon.usedCount : 0
      }));

      return NextResponse.json({
        success: true,
        data: couponsWithUsedCount,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } else {
      // Non-paginated query (for admin dashboard)
      const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

      // Ensure usedCount is included and has a default value if missing
      const couponsWithUsedCount = coupons.map(coupon => ({
        ...coupon,
        usedCount: coupon.usedCount !== undefined && coupon.usedCount !== null ? coupon.usedCount : 0
      }));

      return NextResponse.json({
        success: true,
        data: couponsWithUsedCount
      });
    }
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
    const { code, category, discountPercentage, usageLimitType, totalUsageLimit, perUserUsageLimit, isActive, isHidden } = body;

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

    // Create coupon - ensure isHidden is always explicitly set
    // Always set isHidden explicitly, even if false, to ensure it's saved
    const isHiddenValue = typeof isHidden === 'boolean' ? isHidden : false;
    
    const couponData = {
      code: code.toUpperCase().trim(),
      category,
      discountPercentage,
      usageLimitType,
      perUserUsageLimit,
      usedCount: 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      isHidden: isHiddenValue, // Always explicitly set
      ...(usageLimitType === 'custom' && { totalUsageLimit })
    };

    console.log('Creating coupon with data:', JSON.stringify(couponData, null, 2));
    console.log('isHidden value being set:', isHiddenValue, 'type:', typeof isHiddenValue);

    // Create coupon - Mongoose should save all fields including isHidden
    const coupon = await Coupon.create(couponData);
    
    // Convert to plain object immediately to check what was saved
    const couponPlain = coupon.toObject ? coupon.toObject() : JSON.parse(JSON.stringify(coupon));
    console.log('Coupon after create (plain object):', JSON.stringify(couponPlain, null, 2));
    
    // Force save to ensure isHidden is persisted if it's missing
    if (couponPlain.isHidden === undefined || couponPlain.isHidden === null) {
      console.log('isHidden is missing, force setting it...');
      coupon.set('isHidden', isHiddenValue);
      await coupon.save({ validateBeforeSave: true });
      const afterSave = coupon.toObject ? coupon.toObject() : JSON.parse(JSON.stringify(coupon));
      console.log('Coupon after force save:', JSON.stringify(afterSave, null, 2));
    }
    
    // Final response object
    const couponDataResponse = coupon.toObject ? coupon.toObject() : JSON.parse(JSON.stringify(coupon));
    console.log('Final coupon response:', { _id: couponDataResponse._id, code: couponDataResponse.code, isHidden: couponDataResponse.isHidden });

    return NextResponse.json({
      success: true,
      data: couponDataResponse,
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

