import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();
    
    // Get type filter from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Build query filter
    const filter: { isActive: boolean; treeType?: string } = { isActive: true };
    if (type === 'individual' || type === 'company' || type === 'forest' || type === 'dealer') {
      filter.treeType = type;
    }
    
    const trees = await Tree.find(filter).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    console.error('Error fetching trees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}
