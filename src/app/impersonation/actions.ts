"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { encode } from "next-auth/jwt";
import { auth } from "@/auth";
import { requirePlatformOwner } from "@/lib/authz";
import { authPrisma, scopedDb } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";

// Auth.js's own default -- matched here so a minted session behaves the
// same as a real one instead of expiring at an arbitrary different time.
const MAX_AGE = 30 * 24 * 60 * 60;

// Auth.js derives its session cookie's name (and, confusingly, also its JWT
// encryption salt -- see options.cookies.sessionToken.name in @auth/core) from
// whether the request is HTTPS: "__Secure-authjs.session-token" if so, plain
// "authjs.session-token" otherwise (so cookies still work on http://localhost
// in development). Mirrored here via the same signal a reverse proxy sets --
// there's no request object to read `url.protocol` from directly inside a
// Server Action, the way Auth.js's own request handler can.
async function sessionCookieName(): Promise<{ name: string; secure: boolean }> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const secure = proto === "https";
  return { name: secure ? "__Secure-authjs.session-token" : "authjs.session-token", secure };
}

// Mints a real Auth.js session token and sets it as the session cookie
// directly -- the only way to sign in as a specific user without their
// password, since Auth.js's own signIn() always goes through a provider
// (here, Credentials, which needs one). Payload shape mirrors exactly what
// auth.ts's own `jwt` callback produces on a real sign-in, so every other
// part of the app (which only ever reads the decoded session, never cares
// how it was minted) behaves identically either way.
async function setSessionToken(payload: {
  sub: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  impersonatedBy?: string;
}): Promise<void> {
  const { name, secure } = await sessionCookieName();
  const token = await encode({ secret: process.env.AUTH_SECRET!, salt: name, token: payload, maxAge: MAX_AGE });
  const store = await cookies();
  store.set(name, token, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: MAX_AGE });
}

// Lets the platform owner see exactly what an organization's admin sees --
// for support, without needing their password (which the owner never has
// and never should). Always the organization's longest-standing real admin
// login, not a picker -- keeps this to the one thing it needs to be for
// support rather than a general-purpose "log in as anyone" tool.
export async function impersonateOrganization(organizationId: string) {
  const ownerSession = await requirePlatformOwner();

  const db = scopedDb(organizationId);
  const targetUser = await db.user.findFirst({
    where: { role: "ADMIN", NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
    orderBy: { createdAt: "asc" },
  });
  if (!targetUser) throw new Error("This organization has no admin login to view as.");

  await setSessionToken({
    sub: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: targetUser.role,
    organizationId: targetUser.organizationId,
    impersonatedBy: ownerSession.user.id,
  });

  // Lands in this organization's own Activity log, not the owner's --
  // AuditLog.actorId still points at the owner's real (cross-organization)
  // user id, which this organization's own scoped reads can't join back to
  // a name (RLS on User only allows this organization's own rows), so it
  // shows as "Unknown" there. The summary text stands on its own regardless
  // -- same reasoning as every other AuditLog.summary in this app.
  await logAudit(db, {
    actorId: ownerSession.user.id,
    entityType: "Staff",
    entityId: targetUser.id,
    summary: `Platform owner viewed this organization as ${targetUser.name}`,
  });

  redirect("/admin");
}

// Restores the owner's own session. Reads impersonatedBy off the CURRENT
// (impersonated) session to know who to switch back to -- the exit action
// is only ever reachable from inside an impersonated session in the first
// place (see ImpersonationBanner), so there's always one to read.
export async function stopImpersonating() {
  const session = await auth();
  const ownerId = session?.user?.impersonatedBy;
  if (!session?.user || !ownerId) redirect("/login");

  // Reading the owner's own User row by id, with no organization to scope
  // into -- the same shape of lookup as auth.ts's login, and the same fix:
  // the narrowly-scoped evo_auth role (SELECT only, only on User) rather
  // than the raw client, which RLS would otherwise deny outright.
  const owner = await authPrisma.user.findUniqueOrThrow({ where: { id: ownerId } });

  await setSessionToken({
    sub: owner.id,
    name: owner.name,
    email: owner.email,
    role: owner.role,
    organizationId: owner.organizationId,
    // No impersonatedBy this time -- a genuine session again.
  });

  redirect("/owner");
}
