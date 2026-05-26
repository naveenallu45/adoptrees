import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import EcoFriendRequest from '@/models/EcoFriendRequest';
import EcoFriendship, { getEcoFriendPairKey } from '@/models/EcoFriendship';
import EcoConversation from '@/models/EcoConversation';
import { requireIndividualSession } from '@/lib/eco-community';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid friend request' },
        { status: 400 }
      );
    }

    await connectDB();

    const friendRequest = await EcoFriendRequest.findOne({
      _id: id,
      receiver: authResult.userObjectId,
      status: 'pending',
    });

    if (!friendRequest) {
      return NextResponse.json(
        { success: false, error: 'Pending friend request not found' },
        { status: 404 }
      );
    }

    const requesterId = String(friendRequest.requester);
    const receiverId = String(friendRequest.receiver);
    const [userA, userB] = [requesterId, receiverId].sort();

    const friendship = await EcoFriendship.findOneAndUpdate(
      { pairKey: getEcoFriendPairKey(requesterId, receiverId) },
      {
        $setOnInsert: {
          userA: new Types.ObjectId(userA),
          userB: new Types.ObjectId(userB),
          pairKey: getEcoFriendPairKey(requesterId, receiverId),
          createdFromRequest: friendRequest._id,
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
            new Types.ObjectId(requesterId),
            new Types.ObjectId(receiverId),
          ],
        },
      },
      { new: true, upsert: true }
    );

    if (!conversation) {
      throw new Error('Failed to create Eco Conversation');
    }

    friendRequest.status = 'accepted';
    friendRequest.actedAt = new Date();
    await friendRequest.save();

    return NextResponse.json({
      success: true,
      data: {
        friendshipId: String(friendship._id),
        conversationId: String(conversation._id),
      },
    });
  } catch (error) {
    console.error('Error accepting Eco Friend request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept Eco Friend request' },
      { status: 500 }
    );
  }
}
