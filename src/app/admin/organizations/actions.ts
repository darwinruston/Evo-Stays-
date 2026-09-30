"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma, scopedDb } from "@/lib/prisma";
import { requirePlatformOwner } from "@/lib/authz";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Creates a new tenant and its first login in one step -- a trial company
// starts here, not as a raw database row someone has to script. The org
// itself is created via the unscoped client (Organization carries no RLS --
// see UNSCOPED_MODELS in src/lib/prisma.ts), then its first admin is
// created through a client freshly scoped to that new org, the same way any
// other write in the app is scoped, just built from an id that didn't exist
// a moment ago instead of the caller's own session.
export async function createOrganization(formData: FormData) {
  await requirePlatformOwner();

  const orgName = str(formData, "orgName");
  const adminName = str(formData, "adminName");
  const adminEmail = str(formData, "adminEmail");
  const adminPassword = str(formData, "adminPassword");
  if (!orgName) throw new Error("Organization name is required");
  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error("The first admin's name, email and password are all required");
  }
  if (adminPassword.length < 8) throw new Error("Password must be at least 8 characters");

  // Email is globally unique platform-wide (see the User model comment in
  // schema.prisma) -- checked against the unscoped client, since this has
  // to catch a clash with any organization, not just a new one that has no
  // users yet to clash with.
  const existing = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
  if (existing) throw new Error("That email address already has a login");

  const organization = await prisma.organization.create({ data: { name: orgName } });
  const db = scopedDb(organization.id);

  await db.user.create({
    data: {
      organizationId: organization.id,
      name: adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  revalidatePath("/admin/organizations");
  redirect("/admin/organizations");
}
