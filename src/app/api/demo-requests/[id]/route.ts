import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DemoRequest from '@/models/DemoRequest';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const updateData: { status?: string; notes?: string } = {};
    if (status) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const demoRequest = await DemoRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!demoRequest) {
      return NextResponse.json(
        { success: false, error: 'Demo request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: demoRequest,
    });
  } catch (error) {
    console.error('Error updating demo request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update demo request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const demoRequest = await DemoRequest.findByIdAndDelete(id);

    if (!demoRequest) {
      return NextResponse.json(
        { success: false, error: 'Demo request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting demo request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete demo request' },
      { status: 500 }
    );
  }
}

