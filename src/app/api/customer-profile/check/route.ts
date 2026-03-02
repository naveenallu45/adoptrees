import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only dealers can check customer profiles
    if (session.user.userType !== 'dealer') {
      return NextResponse.json(
        { success: false, error: 'Only dealers can check customer profiles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if customer account exists
    const customer = await User.findOne({ email: email.toLowerCase().trim() })
      .select('name image publicId qrCode email phone')
      .lean();

    if (customer) {
      return NextResponse.json({
        success: true,
        data: {
          exists: true,
          name: customer.name || '',
          phone: customer.phone || '',
          image: customer.image || null,
          publicId: customer.publicId || null,
          hasQrCode: !!customer.qrCode
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: false
      }
    });

  } catch (error) {
    console.error('Customer profile check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to check customer profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}

