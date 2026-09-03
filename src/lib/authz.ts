import { redirect } from "next/navigation";
import { auth } from "@/auth";

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
