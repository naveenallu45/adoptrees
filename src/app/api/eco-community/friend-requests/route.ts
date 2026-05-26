import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import EcoFriendRequest from '@/models/EcoFriendRequest';
import EcoFriendship, { getEcoFriendPairKey } from '@/models/EcoFriendship';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import {
  findIndividualUserById,
  getDisplayName,
  requireIndividualSession,
  serializeEcoUser,
} from '@/lib/eco-community';
import { sendEcoFriendRequestEmail } from '@/lib/email';

type PopulatedFriendRequest = {
  _id: unknown;
  requester: {
    _id: unknown;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    publicId?: string | null;
    createdAt?: Date | string | null;
  };
  receiver: {
    _id: unknown;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    publicId?: string | null;
    createdAt?: Date | string | null;
  };
  status: string;
  createdAt: Date | string;
};

export async function GET() {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    await connectDB();

    const requests = await EcoFriendRequest.find({
      status: 'pending',
      $or: [
        { requester: authResult.userObjectId },
        { receiver: authResult.userObjectId },
      ],
    })
      .populate('requester', '_id name email image publicId createdAt')
      .populate('receiver', '_id name email image publicId createdAt')
      .sort({ createdAt: -1 })
      .lean<PopulatedFriendRequest[]>();

    return NextResponse.json({
      success: true,
      data: requests.map((friendRequest) => {
        const requesterId = String(friendRequest.requester._id);
        const direction = requesterId === authResult.userId ? 'outgoing' : 'incoming';
        const otherUser =
          direction === 'outgoing' ? friendRequest.receiver : friendRequest.requester;

        return {
          id: String(friendRequest._id),
          direction,
          user: serializeEcoUser(otherUser),
          createdAt: new Date(friendRequest.createdAt).toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error('Error loading Eco Friend requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load friend requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) return rateLimitResult.response;

    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const body = (await request.json()) as { receiverId?: string };
    const receiverId = body.receiverId;

    if (!receiverId || receiverId === authResult.userId || !Types.ObjectId.isValid(receiverId)) {
      return NextResponse.json(
        { success: false, error: 'A valid receiver is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const [receiver, friendship, existingRequest] = await Promise.all([
      findIndividualUserById(receiverId),
      EcoFriendship.findOne({
        pairKey: getEcoFriendPairKey(authResult.userId, receiverId),
      }).lean(),
      EcoFriendRequest.findOne({
        status: 'pending',
        pairKey: getEcoFriendPairKey(authResult.userId, receiverId),
      }).lean(),
    ]);

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'Eco Community user not found' },
        { status: 404 }
      );
    }

    if (friendship) {
      return NextResponse.json(
        { success: false, error: 'You are already Eco Friends' },
        { status: 409 }
      );
    }

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'An Eco Friend request is already pending' },
        { status: 409 }
      );
    }

    const friendRequest = await EcoFriendRequest.create({
      requester: authResult.userObjectId,
      receiver: new Types.ObjectId(receiverId),
      pairKey: getEcoFriendPairKey(authResult.userId, receiverId),
      status: 'pending',
    });

    if (receiver.email) {
      sendEcoFriendRequestEmail({
        to: receiver.email,
        receiverName: getDisplayName(receiver),
        requesterName: getDisplayName(authResult.session.user),
        communityUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://adoptrees.com'}/eco-community`,
      }).catch((emailError) => {
        console.error('Failed to send Eco Friend request email:', emailError);
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(friendRequest._id),
          relationshipStatus: 'outgoing_pending',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending Eco Friend request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send Eco Friend request' },
      { status: 500 }
    );
  }
}
