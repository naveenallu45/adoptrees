import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import EcoFriendRequest from '@/models/EcoFriendRequest';
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

    const friendRequest = await EcoFriendRequest.findOneAndUpdate(
      {
        _id: id,
        receiver: authResult.userObjectId,
        status: 'pending',
      },
      {
        $set: {
          status: 'rejected',
          actedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!friendRequest) {
      return NextResponse.json(
        { success: false, error: 'Pending friend request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting Eco Friend request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject Eco Friend request' },
      { status: 500 }
    );
  }
}
