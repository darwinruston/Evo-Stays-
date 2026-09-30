import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { scopedDb, type ScopedPrismaClient } from "@/lib/prisma";

const STAFF_ROLES = ["ADMIN", "OFFICE"];
const CLEANER_ROLES = ["ADMIN", "CLEANER"];

// Whether a session belongs to the platform owner -- a simple env-var email
// check rather than a new role or schema concept, since this will only ever
// be one person for the foreseeable future. Deliberately not role-based: the
// owner's own User row still needs *some* role to satisfy the schema, but
// that role has no bearing on whether they're the owner.
function isPlatformOwner(email: string | null | undefined): boolean {
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL;
  return !!ownerEmail && email === ownerEmail;
}

// Gates the whole /owner area -- the platform owner's own space for managing
// every organization on the platform (who exists, how many properties
// they're running, trial vs paid). The owner isn't a customer using Evo
// Stays as a service the way every other account is, so this is kept
// entirely separate from /admin and /cleaner, not a page tucked inside
// either -- see the redirect in requireStaff/requireCleaner below for the
// other half of that separation.
export async function requirePlatformOwner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isPlatformOwner(session.user.email)) redirect("/");
  return session;
}

// Office/admin staff manage clients, properties, cleaners, cleans and the
// stock catalogue. Cleaners are redirected away -- and so is the platform
// owner, straight to their own /owner area: that account manages the
// platform, it doesn't run a cleaning business inside it, so there's
// nothing for it to do here even though its User row technically carries a
// staff role to satisfy the schema.
//
// Returns the scoped Prisma client alongside the session, not just the
// session -- every query a staff page or action runs should go through this
// `db`, not the raw `prisma` singleton, so it's automatically confined to
// the signed-in user's own organization (see scopedDb in src/lib/prisma.ts).
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isPlatformOwner(session.user.email)) redirect("/owner");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/");
  return { session, db: scopedDb(session.user.organizationId) };
}

// Managing who can log in as staff is admin-only -- office users run the
// day-to-day schedule but can't create or change other staff logins.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isPlatformOwner(session.user.email)) redirect("/owner");
  if (session.user.role === "OFFICE") redirect("/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  return { session, db: scopedDb(session.user.organizationId) };
}

// For generateMetadata on staff-only detail pages. Metadata is resolved
// alongside the page, so its <title> can end up in the response body even
// when the layout's requireStaff redirects a cleaner away -- which would
// hand them a client's name, or an issue at a property they're not on,
// just by guessing a URL. Those callers check this first and fall back to a
// generic title.
export async function isStaffSession(): Promise<boolean> {
  const session = await auth();
  return !!session?.user && !isPlatformOwner(session.user.email) && STAFF_ROLES.includes(session.user.role);
}

// Same use case as isStaffSession (generateMetadata can't call requireStaff,
// which redirects), but for the common case of also needing a lookup for
// the title itself -- hands back a scoped db instead of a bare boolean, or
// null when there's no staff session to scope into.
export async function staffMetadataDb(): Promise<ScopedPrismaClient | null> {
  const session = await auth();
  if (!session?.user || isPlatformOwner(session.user.email) || !STAFF_ROLES.includes(session.user.role)) {
    return null;
  }
  return scopedDb(session.user.organizationId);
}

// Cleaners work their own schedule on site. Admins can also reach this area
// (support/testing); office staff and the platform owner cannot -- same
// reasoning as requireStaff above. Same { session, db } shape as
// requireStaff, for the same reason.
export async function requireCleaner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isPlatformOwner(session.user.email)) redirect("/owner");
  if (!CLEANER_ROLES.includes(session.user.role)) redirect("/");
  return { session, db: scopedDb(session.user.organizationId) };
}

// A cleaner sees a property only where they hold a clean -- any status, so
// they keep access to their own completed history. Access notes carry key
// safe and alarm codes, so browsing the whole estate isn't something the job
// needs. Expressed as a Prisma `where` fragment so list queries filter in the
// database rather than fetching everything and filtering after.
export function cleanerPropertyWhere(userId: string) {
  return { cleans: { some: { assignedToId: userId } } };
}

export async function cleanerCanSeeProperty(
  db: ScopedPrismaClient,
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const clean = await db.clean.findFirst({
    where: { propertyId, assignedToId: userId },
    select: { id: true },
  });
  return clean !== null;
}
