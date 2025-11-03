import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const { keyId, keySecret } = await request.json();

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: 'Key ID and Key Secret are required' },
        { status: 400 }
      );
    }

    // Test the credentials by creating a Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Try to create a test order
    const testOrder = await razorpay.orders.create({
      amount: 100, // ₹1.00
      currency: 'INR',
      receipt: 'test_' + Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Credentials are valid',
      orderId: testOrder.id
    });

  } catch (error: unknown) {
    const errorObj = error as { statusCode?: number; message?: string };
    if (errorObj.statusCode === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials - Authentication failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorObj.message || 'Unknown error occurred' },
      { status: 400 }
    );
  }
}
