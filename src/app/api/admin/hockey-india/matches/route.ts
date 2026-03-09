import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HockeyMatch, { IHockeyMatch } from '@/models/HockeyMatch';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const matches = await HockeyMatch.find()
      .sort({ matchDate: -1 })
      .limit(Number.isNaN(limit) ? 100 : limit)
      .lean<IHockeyMatch>();

    const totalTreesPlanted = matches.reduce((sum, m) => {
      const estimated =
        (m.penaltyCorners || 0) * (m.treesPerPenaltyCorner || 0) +
        (m.fieldGoals || 0) * (m.treesPerFieldGoal || 0);
      const trees =
        m.treesPlanted && m.treesPlanted > 0
          ? m.treesPlanted
          : estimated;
      return sum + trees;
    }, 0);
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
    console.error('Error fetching Hockey India matches:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      matchId,
      tournament,
      venue,
      homeTeam,
      awayTeam,
      matchDate,
      penaltyCorners,
      fieldGoals,
      treesPerPenaltyCorner,
      treesPerFieldGoal,
      treesPlanted,
      notes,
    } = body;

    if (!matchId || !homeTeam?.name || !awayTeam?.name || !matchDate) {
      return NextResponse.json(
        { success: false, message: 'matchId, teams, and matchDate are required' },
        { status: 400 }
      );
    }

    const match = await HockeyMatch.findOneAndUpdate(
      { matchId },
      {
        matchId,
        tournament,
        venue,
        homeTeam,
        awayTeam,
        matchDate,
        penaltyCorners,
        fieldGoals,
        treesPerPenaltyCorner,
        treesPerFieldGoal,
        treesPlanted,
        notes,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: match });
  } catch (error) {
    console.error('Error creating/updating Hockey India match:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save match' },
      { status: 500 }
    );
  }
}

