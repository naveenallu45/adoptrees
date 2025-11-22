import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import Order from '@/models/Order';
import { auth } from '@/app/api/auth/[...nextauth]/route';

// POST - Validate and get coupon details
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { code, userType, subtotal } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
    
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive coupon code' },
        { status: 404 }
      );
    }

    // Check category match
    if (coupon.category !== userType) {
      return NextResponse.json(
        { success: false, error: `This coupon is only valid for ${coupon.category} users` },
        { status: 400 }
      );
    }

    // Check total usage limit
    if (coupon.usageLimitType === 'custom' && coupon.totalUsageLimit) {
      if (coupon.usedCount >= coupon.totalUsageLimit) {
        return NextResponse.json(
          { success: false, error: 'This coupon has reached its usage limit' },
          { status: 400 }
        );
      }
    }

    // Check per user usage limit
    if (session.user.id) {
      const userOrders = await Order.find({
        userId: session.user.id,
        couponCode: coupon.code,
        paymentStatus: 'paid'
      });

      if (userOrders.length >= coupon.perUserUsageLimit) {
        return NextResponse.json(
          { success: false, error: `You have already used this coupon ${coupon.perUserUsageLimit} time(s)` },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    const discountAmount = (subtotal * coupon.discountPercentage) / 100;
    const finalAmount = subtotal - discountAmount;

    return NextResponse.json({
      success: true,
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
        subtotal: subtotal
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

// GET - Get available coupons for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const userType = searchParams.get('userType');

    if (!userType || (userType !== 'individual' && userType !== 'company')) {
      return NextResponse.json(
        { success: false, error: 'Valid userType is required' },
        { status: 400 }
      );
    }

    // Get active coupons for this user type
    const coupons = await Coupon.find({
      category: userType,
      isActive: true
    }).select('code discountPercentage').lean();

    // Filter coupons that haven't reached their usage limit
    const availableCoupons = [];
    
    for (const coupon of coupons) {
      let isAvailable = true;

      // Check total usage limit
      if (coupon.usageLimitType === 'custom' && coupon.totalUsageLimit) {
        if (coupon.usedCount >= coupon.totalUsageLimit) {
          isAvailable = false;
        }
      }

      // Check per user usage limit if user is logged in
      if (isAvailable && session.user.id) {
        const userOrders = await Order.find({
          userId: session.user.id,
          couponCode: coupon.code,
          paymentStatus: 'paid'
        });

        if (userOrders.length >= coupon.perUserUsageLimit) {
          isAvailable = false;
        }
      }

      if (isAvailable) {
        availableCoupons.push({
          code: coupon.code,
          discountPercentage: coupon.discountPercentage
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: availableCoupons
    });
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available coupons' },
      { status: 500 }
    );
  }
}

