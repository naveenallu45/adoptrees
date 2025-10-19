import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';

export async function GET() {
  try {
    await connectDB();
    const trees = await Tree.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    console.error('Error fetching trees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}
