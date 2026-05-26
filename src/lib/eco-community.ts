import { NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import type { Session } from 'next-auth';
import User from '@/models/User';

export type EcoCommunityAuthResult =
  | { ok: true; session: Session; userId: string; userObjectId: Types.ObjectId }
  | { ok: false; response: NextResponse };

export function getDisplayName(user: {
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
}) {
  return user.name || user.companyName || user.email?.split('@')[0] || 'Eco Friend';
}

export function isIndividualSession(session: Session | null) {
  return session?.user?.role === 'user' && session.user.userType === 'individual';
}

export function requireIndividualSession(session: Session | null): EcoCommunityAuthResult {
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (!isIndividualSession(session)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Eco Community is available for individual users only' },
        { status: 403 }
      ),
    };
  }

  if (!isValidObjectId(session.user.id)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid user session' },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    session,
    userId: session.user.id,
    userObjectId: new Types.ObjectId(session.user.id),
  };
}

export async function findIndividualUserById(userId: string) {
  if (!isValidObjectId(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    role: 'user',
    userType: 'individual',
  })
    .select('_id name email image publicId createdAt')
    .lean();
}

export function sanitizeMessageBody(body: unknown) {
  if (typeof body !== 'string') return '';
  return body.replace(/\s+/g, ' ').trim().slice(0, 1000);
}

export function serializeEcoUser(user: {
  _id: unknown;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  publicId?: string | null;
  createdAt?: Date | string | null;
}) {
  return {
    id: String(user._id),
    name: getDisplayName(user),
    image: user.image || null,
    publicId: user.publicId || null,
    joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  };
}
