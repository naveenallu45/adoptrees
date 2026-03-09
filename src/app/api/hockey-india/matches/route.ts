import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HockeyMatch, { IHockeyMatch } from '@/models/HockeyMatch';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '12', 10);

    const matches = await HockeyMatch.find()
      .sort({ matchDate: -1 })
      .limit(Number.isNaN(limit) ? 12 : limit)
      .lean<IHockeyMatch>();

    const totalTreesPlanted = matches.reduce((sum, m) => sum + (m.treesPlanted || 0), 0);
    const totalTreesEstimated = matches.reduce(
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
        totalMatches: matches.length,
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

