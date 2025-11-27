import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DemoRequest from '@/models/DemoRequest';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Create demo request
    const demoRequest = await DemoRequest.create({
      email: email.toLowerCase().trim(),
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      data: demoRequest,
      message: 'Demo request submitted successfully',
    });
  } catch (error) {
    console.error('Error creating demo request:', error);
    
    // Handle duplicate email error (if unique index is enabled)
    if (error instanceof Error && error.message.includes('E11000')) {
      return NextResponse.json(
        { success: false, error: 'A demo request with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to submit demo request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Build query
    const query: { status?: string } = {};
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await DemoRequest.countDocuments(query);

    // Get demo requests
    const demoRequests = await DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: demoRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demo requests' },
      { status: 500 }
    );
  }
}

