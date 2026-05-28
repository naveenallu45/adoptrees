import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import EcoConversation from '@/models/EcoConversation';
import EcoMessage from '@/models/EcoMessage';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/redis-rate-limit';
import {
  getDisplayName,
  requireIndividualSession,
  sanitizeMessageBody,
} from '@/lib/eco-community';
import { sendEcoChatMessageEmail } from '@/lib/email';

type LeanConversation = {
  _id: unknown;
  participants: unknown[];
};

type LeanMessage = {
  _id: unknown;
  conversation: unknown;
  sender: unknown;
  receiver: unknown;
  body: string;
  readAt?: Date | string | null;
  createdAt: Date | string;
};

function isParticipant(conversation: LeanConversation, userId: string) {
  return conversation.participants.some((participant) => String(participant) === userId);
}

function getOtherParticipantId(conversation: LeanConversation, userId: string) {
  return conversation.participants
    .map((participant) => String(participant))
    .find((participantId) => participantId !== userId);
}

function serializeMessage(message: LeanMessage) {
  return {
    id: String(message._id),
    conversationId: String(message.conversation),
    senderId: String(message.sender),
    receiverId: String(message.receiver),
    body: message.body,
    readAt: message.readAt ? new Date(message.readAt).toISOString() : null,
    createdAt: new Date(message.createdAt).toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid conversation' },
        { status: 400 }
      );
    }

    await connectDB();

    const conversation = await EcoConversation.findById(id)
      .select('_id participants')
      .lean<LeanConversation | null>();

    if (!conversation || !isParticipant(conversation, authResult.userId)) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '80', 10), 100);

    await EcoMessage.updateMany(
      {
        conversation: id,
        receiver: authResult.userObjectId,
        readAt: null,
      },
      {
        $set: {
          readAt: new Date(),
        },
      }
    );

    const messages = await EcoMessage.find({ conversation: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanMessage[]>();

    return NextResponse.json({
      success: true,
      data: messages.reverse().map(serializeMessage),
    });
  } catch (error) {
    console.error('Error loading Eco Community messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await checkRateLimit(request, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) return rateLimitResult.response;

    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid conversation' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { body?: unknown };
    const messageBody = sanitizeMessageBody(body.body);

    if (!messageBody) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    await connectDB();

    const conversation = await EcoConversation.findById(id)
      .select('_id participants')
      .lean<LeanConversation | null>();

    if (!conversation || !isParticipant(conversation, authResult.userId)) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const receiverId = getOtherParticipantId(conversation, authResult.userId);
    if (!receiverId) {
      return NextResponse.json(
        { success: false, error: 'Conversation participant not found' },
        { status: 400 }
      );
    }

    const message = await EcoMessage.create({
      conversation: new Types.ObjectId(id),
      sender: authResult.userObjectId,
      receiver: new Types.ObjectId(receiverId),
      body: messageBody,
    });

    await EcoConversation.updateOne(
      { _id: id },
      {
        $set: {
          lastMessage: messageBody,
          lastMessageAt: message.createdAt,
        },
      }
    );

    const serializedMessage = serializeMessage(message.toObject() as LeanMessage);

    const receiver = await User.findById(receiverId)
      .select('email name companyName')
      .lean<{ email?: string; name?: string; companyName?: string } | null>();

    if (receiver?.email) {
      await sendEcoChatMessageEmail({
        to: receiver.email,
        receiverName: getDisplayName(receiver),
        senderName: getDisplayName(authResult.session.user),
        messageBody,
        communityUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://adoptrees.com'}/eco-community?conversation=${id}`,
      }).catch((emailError) => {
        console.error('Failed to send Eco Community chat email:', emailError);
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: serializedMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending Eco Community message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
