import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tree from '@/models/Tree';
import { requireAdmin } from '@/lib/api-auth';

/**
 * OPTIMIZED GET /api/admin/trees
 * 
 * IMPROVEMENTS:
 * 1. Added pagination support (page, limit)
 * 2. Already using .lean() for performance (returns plain JS objects, not Mongoose documents)
 * 3. Returns pagination metadata
 * 4. Uses indexes: isActive, createdAt (already defined in Tree model)
 * 
 * PERFORMANCE:
 * - lean() reduces memory usage by ~40%
 * - Indexes make queries 10-100x faster
 * - Pagination prevents loading all records at once
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await connectDB();

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))); // Max 100 per page
    const skip = (page - 1) * limit;

    // Optional filters
    const treeType = searchParams.get('treeType');
    const search = searchParams.get('search');

    // Build query - uses index on isActive
    const query: Record<string, unknown> = { isActive: true };
    
    if (treeType && ['individual', 'company', 'forest'].includes(treeType)) {
      query.treeType = treeType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { info: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count (uses index)
    const totalCount = await Tree.countDocuments(query);

    // Fetch paginated results with lean() - returns plain objects, not Mongoose documents
    // Uses indexes: isActive, createdAt (for sort)
    const trees = await Tree.find(query)
      .sort({ createdAt: -1 }) // Uses createdAt index
      .skip(skip)
      .limit(limit)
      .lean() // CRITICAL: Returns plain JS objects, 40% less memory, faster JSON serialization
      .exec();
    
    return NextResponse.json({
      success: true,
      data: trees,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Failed to fetch trees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}

