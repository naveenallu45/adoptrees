import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import EcoFriendship from '@/models/EcoFriendship';
import { requireIndividualSession, serializeEcoUser } from '@/lib/eco-community';

type LeanFriendship = {
  userA: unknown;
  userB: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '60', 10), 100);

    const friendships = await EcoFriendship.find({
      $or: [{ userA: authResult.userObjectId }, { userB: authResult.userObjectId }],
    })
      .select('userA userB')
      .lean<LeanFriendship[]>();

    const friendIds = new Set(
      friendships.map((friendship) => {
        const userA = String(friendship.userA);
        const userB = String(friendship.userB);
        return userA === authResult.userId ? userB : userA;
      })
    );

    const excludedUserIds = [authResult.userId, ...Array.from(friendIds)];

    const query: Record<string, unknown> = {
      _id: { $nin: excludedUserIds },
      role: 'user',
      userType: 'individual',
    };

    if (search) {
      query.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const users = await User.find(query)
      .select('_id name image publicId createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: users.map((user) => {
        return {
          ...serializeEcoUser(user),
          relationshipStatus: 'none',
          requestId: null,
        };
      }),
    });
  } catch (error) {
    console.error('Error loading Eco Community profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load Eco Community profiles' },
      { status: 500 }
    );
  }
}
