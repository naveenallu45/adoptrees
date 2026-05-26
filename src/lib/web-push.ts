type StoredPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type WebPushClient = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: StoredPushSubscription, payload: string): Promise<unknown>;
};

let vapidConfigured = false;
let webPushClient: WebPushClient | null | undefined;

function loadWebPushClient(): WebPushClient | null {
  if (webPushClient !== undefined) return webPushClient;

  try {
    const requireFn = eval('require') as (packageName: string) => WebPushClient;
    webPushClient = requireFn('web-push');
  } catch {
    webPushClient = null;
  }

  return webPushClient;
}

function configureWebPush() {
  if (vapidConfigured) return true;

  const webPush = loadWebPushClient();
  if (!webPush) return false;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@adoptrees.com';

  if (!publicKey || !privateKey) {
    return false;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendChatPushNotification(
  subscriptions: StoredPushSubscription[],
  payload: {
    title: string;
    body: string;
    url: string;
    conversationId: string;
  }
) {
  const webPush = loadWebPushClient();

  if (!webPush || !configureWebPush() || subscriptions.length === 0) {
    return { sent: 0, failedEndpoints: [] as string[] };
  }

  const serializedPayload = JSON.stringify({
    ...payload,
    primaryKey: payload.conversationId,
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webPush.sendNotification(subscription, serializedPayload)
    )
  );

  const failedEndpoints = results.flatMap((result, index) =>
    result.status === 'rejected' ? [subscriptions[index].endpoint] : []
  );

  return {
    sent: results.length - failedEndpoints.length,
    failedEndpoints,
  };
}
