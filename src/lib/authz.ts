import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["ADMIN", "OFFICE"];
const CLEANER_ROLES = ["ADMIN", "CLEANER"];

// Office/admin staff manage clients, properties, cleaners, cleans and the
// stock catalogue. Cleaners are redirected away.
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/");
  return session;
}

// Managing who can log in as staff is admin-only -- office users run the
// day-to-day schedule but can't create or change other staff logins.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "OFFICE") redirect("/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

// For generateMetadata on staff-only detail pages. Metadata is resolved
// alongside the page, so its <title> can end up in the response body even
// when the layout's requireStaff redirects a cleaner away -- which would
// hand them a client's name, or an issue at a property they're not on,
// just by guessing a URL. Those callers check this first and fall back to a
// generic title.
export async function isStaffSession(): Promise<boolean> {
  const session = await auth();
  return !!session?.user && STAFF_ROLES.includes(session.user.role);
}

// Cleaners work their own schedule on site. Admins can also reach this area
// (support/testing); office staff cannot.
export async function requireCleaner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!CLEANER_ROLES.includes(session.user.role)) redirect("/");
  return session;
}

// A cleaner sees a property only where they hold a clean -- any status, so
// they keep access to their own completed history. Access notes carry key
// safe and alarm codes, so browsing the whole estate isn't something the job
// needs. Expressed as a Prisma `where` fragment so list queries filter in the
// database rather than fetching everything and filtering after.
export function cleanerPropertyWhere(userId: string) {
  return { cleans: { some: { assignedToId: userId } } };
}

export async function cleanerCanSeeProperty(userId: string, propertyId: string): Promise<boolean> {
  const clean = await prisma.clean.findFirst({
    where: { propertyId, assignedToId: userId },
    select: { id: true },
  });
  return clean !== null;
}
