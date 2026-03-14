import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HockeyMatch, { HockeyMatchFields } from '@/models/HockeyMatch';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');

    // Build base query for matches, optionally limiting if a limit is explicitly provided
    let matchesQuery = HockeyMatch.find().sort({ matchDate: -1 });
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!Number.isNaN(limit) && limit > 0) {
        matchesQuery = matchesQuery.limit(limit);
      }
    }

    // Fetch matches for display (no limit by default)
    const matches: HockeyMatchFields[] = await matchesQuery.lean();

    // Fetch ALL matches for accurate total calculation (matching admin logic)
    const allMatches: HockeyMatchFields[] = await HockeyMatch.find()
      .sort({ matchDate: -1 })
      .lean();

    // Calculate totals using same logic as admin: use treesPlanted if > 0, otherwise use estimated
    const totalTreesPlanted = allMatches.reduce((sum, m) => {
      const estimated =
        (m.penaltyCorners || 0) * (m.treesPerPenaltyCorner || 0) +
        (m.fieldGoals || 0) * (m.treesPerFieldGoal || 0);
      const trees =
        m.treesPlanted && m.treesPlanted > 0
          ? m.treesPlanted
          : estimated;
      return sum + trees;
    }, 0);

    const totalTreesEstimated = allMatches.reduce(
      (sum, m) =>
        sum +
        (m.penaltyCorners || 0) * (m.treesPerPenaltyCorner || 0) +
        (m.fieldGoals || 0) * (m.treesPerFieldGoal || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: matches,
      metrics: {
        totalMatches: allMatches.length,
        totalTreesPlanted,
        totalTreesEstimated,
      },
    });
  } catch (error) {
    console.error('Error fetching public Hockey India matches:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch Hockey India matches' },
      { status: 500 }
    );
  }
}

