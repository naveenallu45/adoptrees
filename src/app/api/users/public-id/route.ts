import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/app/api/auth/[...nextauth]/route';

function generatePublicId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${random}${timestamp}`.toLowerCase();
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.publicId) {
      // Ensure uniqueness on potential collision
      let publicId = generatePublicId();
      // eslint-disable-next-line no-constant-condition
      while (await User.findOne({ publicId })) {
        publicId = generatePublicId();
      }
      user.publicId = publicId;
      await user.save();
    }

    return NextResponse.json({ success: true, data: { publicId: user.publicId } });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to get public id' }, { status: 500 });
  }
}


