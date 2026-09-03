import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["ADMIN", "OFFICE"];
const CLEANER_ROLES = ["ADMIN", "CLEANER"];
const CLIENT_ROLES = ["CLIENT"];

// Office/admin staff manage clients, properties, cleaners, cleans and the
// stock catalogue. Cleaners and clients are redirected away.
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/");
  return session;
}

// Cleaners work their own schedule on site. Admins can also reach this area
// (support/testing); office staff and clients cannot.
export async function requireCleaner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!CLEANER_ROLES.includes(session.user.role)) redirect("/");
  return session;
}

// Clients see their own portfolio only. Deliberately excludes ADMIN: staff
// have their own richer views, and letting an admin session through here
// would mean every client-scoped query needs a second "but which client?"
// branch -- see the clientId scoping in the /client routes.
export async function requireClient() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!CLIENT_ROLES.includes(session.user.role)) redirect("/");
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

// Every /client page needs the same thing: which portfolio does this login
// belong to? Returns a null clientId rather than redirecting when the login
// isn't linked to a Client -- redirecting would bounce to "/", which sends a
// CLIENT straight back here, i.e. a loop. Callers render an explanatory
// "not linked yet" state instead. Scope EVERY client-facing query by the
// clientId this returns; it is the only thing separating one host's
// portfolio from another's.
export async function requireClientAccount() {
  const session = await requireClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clientId: true },
  });
  return { session, clientId: user?.clientId ?? null };
}
