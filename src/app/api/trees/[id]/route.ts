import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tree ID' },
        { status: 400 }
      );
    }

    const tree = await Tree.findOne({ _id: id, isActive: true });

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tree });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tree' },
      { status: 500 }
    );
  }
}

