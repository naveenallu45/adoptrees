import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { requireIndividualSession } from '@/lib/eco-community';

type BrowserPushSubscription = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

export async function GET() {
  const session = await auth();
  const authResult = requireIndividualSession(session);
  if (!authResult.ok) return authResult.response;

  return NextResponse.json({
    success: true,
    data: {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
      enabled: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const body = (await request.json()) as {
      subscription?: BrowserPushSubscription;
      userAgent?: string;
    };
    const subscription = body.subscription;

    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid push subscription' },
        { status: 400 }
      );
    }

    await connectDB();

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user: authResult.userObjectId,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          userAgent: body.userAgent?.slice(0, 500),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const authResult = requireIndividualSession(session);
    if (!authResult.ok) return authResult.response;

    const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
    if (typeof body.endpoint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Subscription endpoint is required' },
        { status: 400 }
      );
    }

    await connectDB();

    await PushSubscription.deleteOne({
      user: authResult.userObjectId,
      endpoint: body.endpoint,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}
