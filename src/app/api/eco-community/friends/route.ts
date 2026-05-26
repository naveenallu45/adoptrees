import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import EcoFriendship, { getEcoFriendPairKey } from '@/models/EcoFriendship';
import EcoConversation from '@/models/EcoConversation';
import EcoMessage from '@/models/EcoMessage';
import {
  findIndividualUserById,
  getDisplayName,
  requireIndividualSession,
  serializeEcoUser,
} from '@/lib/eco-community';
import { sendEcoFriendRequestEmail } from '@/lib/email';

type PopulatedFriendship = {
  _id: unknown;
  userA: {
    _id: unknown;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    publicId?: string | null;
    createdAt?: Date | string | null;
  };
  userB: {
    _id: unknown;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    publicId?: string | null;
    createdAt?: Date | string | null;
  };
  createdAt: Date | string;
};

type LeanConversation = {
  _id: unknown;
  friendship: unknown;
  lastMessage?: string | null;
  lastMessageAt?: Date | string | null;
};

type UnreadCount = {
  _id: unknown;
  count: number;
};

export async function GET() {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    await connectDB();

    const friendships = await EcoFriendship.find({
      $or: [{ userA: authResult.userObjectId }, { userB: authResult.userObjectId }],
    })
      .populate('userA', '_id name email image publicId createdAt')
      .populate('userB', '_id name email image publicId createdAt')
      .sort({ createdAt: -1 })
      .lean<PopulatedFriendship[]>();

    const conversations = await EcoConversation.find({
      friendship: { $in: friendships.map((friendship) => friendship._id) },
    })
      .select('_id friendship lastMessage lastMessageAt')
      .lean<LeanConversation[]>();

    const conversationByFriendshipId = new Map(
      conversations.map((conversation) => [String(conversation.friendship), conversation])
    );
    const unreadCounts = await EcoMessage.aggregate<UnreadCount>([
      {
        $match: {
          conversation: { $in: conversations.map((conversation) => conversation._id) },
          receiver: authResult.userObjectId,
          readAt: null,
        },
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 },
        },
      },
    ]);
    const unreadCountByConversationId = new Map(
      unreadCounts.map((item) => [String(item._id), item.count])
    );

    return NextResponse.json({
      success: true,
      data: friendships.map((friendship) => {
        const userAId = String(friendship.userA._id);
        const friend = userAId === authResult.userId ? friendship.userB : friendship.userA;
        const conversation = conversationByFriendshipId.get(String(friendship._id));

        return {
          friendshipId: String(friendship._id),
          conversationId: conversation ? String(conversation._id) : null,
          user: serializeEcoUser(friend),
          since: new Date(friendship.createdAt).toISOString(),
          lastMessage: conversation?.lastMessage || null,
          lastMessageAt: conversation?.lastMessageAt
            ? new Date(conversation.lastMessageAt).toISOString()
            : null,
          unreadCount: conversation ? unreadCountByConversationId.get(String(conversation._id)) || 0 : 0,
        };
      }),
    });
  } catch (error) {
    console.error('Error loading Eco Friends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load Eco Friends' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const body = (await request.json()) as { friendId?: string };
    const friendId = body.friendId;

    if (!friendId || friendId === authResult.userId || !Types.ObjectId.isValid(friendId)) {
      return NextResponse.json(
        { success: false, error: 'A valid Eco profile is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const friendUser = await findIndividualUserById(friendId);
    if (!friendUser) {
      return NextResponse.json(
        { success: false, error: 'Eco profile not found' },
        { status: 404 }
      );
    }

    const [userA, userB] = [authResult.userId, friendId].sort();
    const pairKey = getEcoFriendPairKey(authResult.userId, friendId);

    const friendship = await EcoFriendship.findOneAndUpdate(
      { pairKey },
      {
        $setOnInsert: {
          userA: new Types.ObjectId(userA),
          userB: new Types.ObjectId(userB),
          pairKey,
        },
      },
      { new: true, upsert: true }
    );

    if (!friendship) {
      throw new Error('Failed to create Eco Friendship');
    }

    const conversation = await EcoConversation.findOneAndUpdate(
      { friendship: friendship._id },
      {
        $setOnInsert: {
          friendship: friendship._id,
          participants: [
            authResult.userObjectId,
            new Types.ObjectId(friendId),
          ],
        },
      },
      { new: true, upsert: true }
    );

    if (!conversation) {
      throw new Error('Failed to create Eco Conversation');
    }

    const communityUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://adoptrees.com'}/eco-community`;
    const requesterName = getDisplayName(authResult.session.user);
    const friendName = getDisplayName(friendUser);
    const emailTasks: Promise<boolean>[] = [];

    if (friendUser.email) {
      emailTasks.push(
        sendEcoFriendRequestEmail({
          to: friendUser.email,
          receiverName: friendName,
          requesterName,
          communityUrl,
        })
      );
    }

    if (authResult.session.user.email) {
      emailTasks.push(
        sendEcoFriendRequestEmail({
          to: authResult.session.user.email,
          receiverName: requesterName,
          requesterName: friendName,
          communityUrl,
        })
      );
    }

    if (emailTasks.length > 0) {
      Promise.allSettled(emailTasks).then((results) => {
        const failedCount = results.filter((result) => result.status === 'rejected').length;
        if (failedCount > 0) {
          console.error(`Failed to send ${failedCount} Eco Friend email(s)`);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          friendshipId: String(friendship._id),
          conversationId: String(conversation._id),
          user: serializeEcoUser(friendUser),
          since: new Date(friendship.createdAt).toISOString(),
          lastMessage: conversation.lastMessage || null,
          lastMessageAt: conversation.lastMessageAt
            ? new Date(conversation.lastMessageAt).toISOString()
            : null,
          unreadCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding Eco Friend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add Eco Friend' },
      { status: 500 }
    );
  }
}
