import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get type filter from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Build query filter
    const filter: { isActive: boolean; treeType?: string } = { isActive: true };
    if (type === 'individual' || type === 'company') {
      filter.treeType = type;
    }
    
    const trees = await Tree.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: trees });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}
