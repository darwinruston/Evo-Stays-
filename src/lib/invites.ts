import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/email";
import { generateResetToken, hashResetToken } from "@/lib/passwordReset";

// Invite links: someone is added by name and email, and chooses their own
// password from a personal link. It uses the same one-use token as a password
// reset (only its hash is stored), but lasts longer, since it is sent by text
// and may not be opened that day. One link, for one person, working once.
//
// Callers check who may do this: these helpers trust the user id they are
// given.
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export type InviteResult = { error: string } | { inviteLink: string; name: string } | void;

// The password of an invited login until they choose one: random, never shown,
// so it cannot be signed in with.
export async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), 10);
}

export async function cancelInviteLinks(userId: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
}

// Makes a new link, replacing any earlier one. The address is APP_URL when set,
// otherwise the one the person making the link is using right now.
export async function createInviteLink(userId: string): Promise<string> {
  const rawToken = generateResetToken();
  await cancelInviteLinks(userId);
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashResetToken(rawToken), expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS) },
  });

  const path = `/invite/${rawToken}`;
  const configured = absoluteUrl(path);
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
