import webpush from "web-push";
import type { ScopedPrismaClient } from "@/lib/prisma";

// Web push: a notification arriving on someone's phone even when the app
// isn't open. Needs a pair of VAPID keys (see docs/push-notifications.md):
//
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//   VAPID_SUBJECT (optional): a mailto: or https: contact the push services
//   can reach if there's a problem. Defaults to APP_URL, else a placeholder.
//
// Entirely optional, like email: with the keys unset, pushConfigured() is
// false and notifications stay in-app (and email) only.

export function pushConfigured(): boolean {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

let keysSet = false;
function ensureKeys(): void {
  if (keysSet) return;
  const appUrl = process.env.APP_URL;
  const subject = process.env.VAPID_SUBJECT ?? (appUrl?.startsWith("https://") ? appUrl : "mailto:push@evostays.example");
  webpush.setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  keysSet = true;
}

export type PushItem = {
  userId: string;
  title: string;
  body?: string | null;
  // A same-site path. Opened when the notification is tapped.
  url?: string | null;
  // Notifications with the same tag replace each other on the device.
  tag?: string;
};

export type PushResult = { delivered: number; removed: number };

// Sends each item to every device its user has turned alerts on for. Never
// throws: a push is a side effect of a change that's already saved. A device
// the push service says is gone (404 or 410) is forgotten, so a phone that
// was wiped or had the app removed doesn't linger.
export async function sendPushToUsers(db: ScopedPrismaClient, items: PushItem[]): Promise<PushResult> {
  const result: PushResult = { delivered: 0, removed: 0 };
  if (!pushConfigured() || items.length === 0) return result;

  try {
    ensureKeys();
    const userIds = [...new Set(items.map((i) => i.userId))];
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    if (subs.length === 0) return result;

    const gone = new Set<string>();
    const sends: Promise<void>[] = [];
    for (const item of items) {
      const payload = JSON.stringify({
        title: item.title,
        body: item.body ?? "",
        url: item.url && item.url.startsWith("/") && !item.url.startsWith("//") ? item.url : "/",
        tag: item.tag,
      });
      for (const sub of subs.filter((s) => s.userId === item.userId)) {
        sends.push(
          webpush
            .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
              // Hold it for up to 12 hours if the phone is off, then drop it:
              // an hours-old "new clean" is worse than none.
              TTL: 12 * 60 * 60,
            })
            .then(() => {
              result.delivered += 1;
            })
            .catch((err: { statusCode?: number }) => {
              if (err?.statusCode === 404 || err?.statusCode === 410) gone.add(sub.endpoint);
              else console.error("[push] couldn't send to a device:", err?.statusCode ?? err);
            }),
        );
      }
    }
    await Promise.all(sends);

    if (gone.size > 0) {
      await db.pushSubscription.deleteMany({ where: { endpoint: { in: [...gone] } } });
      result.removed = gone.size;
    }
  } catch (err) {
    console.error("[push] couldn't send notifications:", err);
  }
  return result;
}
