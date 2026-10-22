"use server";

import { auth } from "@/auth";
import { scopedDb } from "@/lib/prisma";
import { pushConfigured, sendPushToUsers } from "@/lib/push";

// Shared by every role: each action only ever touches the signed-in
// person's own devices, so there's no role check beyond being signed in.
async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Sign in again.");
  return { session, db: scopedDb(session.user.organizationId) };
}

export type PushActionResult = { ok: true; devices?: number } | { ok: false; error: string };

export type BrowserSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function looksValid(sub: BrowserSubscription): boolean {
  return (
    typeof sub?.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.endpoint.length < 2000 &&
    typeof sub.keys?.p256dh === "string" &&
    sub.keys.p256dh.length < 200 &&
    typeof sub.keys?.auth === "string" &&
    sub.keys.auth.length < 100
  );
}

// Remembers a device so alerts can be sent to it. The same device signing in
// as someone else (a shared phone) simply moves to them.
export async function savePushSubscription(sub: BrowserSubscription, userAgent: string): Promise<PushActionResult> {
  const { session, db } = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Alerts aren't set up on this server yet." };
  if (!looksValid(sub)) return { ok: false, error: "That device couldn't be registered." };

  try {
    await db.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent.slice(0, 200),
      },
      update: { userId: session.user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent.slice(0, 200) },
    });
  } catch {
    // The only realistic cause: the device is already registered to an
    // account in a different company, which this one can't see or move.
    return { ok: false, error: "This device is already registered to another account. Turn alerts off there first." };
  }
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const { session, db } = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  return { ok: true };
}

// A test alert to every device this person has turned on, so they can see it
// works before they depend on it.
export async function sendTestPush(): Promise<PushActionResult> {
  const { session, db } = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Alerts aren't set up on this server yet." };

  const { delivered } = await sendPushToUsers(db, [
    {
      userId: session.user.id,
      title: "Alerts are working",
      body: "You'll get alerts like this on this device.",
      url: "/",
      tag: "test",
    },
  ]);
  return delivered > 0 ? { ok: true, devices: delivered } : { ok: false, error: "Couldn't reach any of your devices." };
}
