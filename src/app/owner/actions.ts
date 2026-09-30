"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { OrganizationPlan } from "@prisma/client";
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

  revalidatePath("/owner");
  redirect("/owner");
}

// The commercial state shown on the Organizations page -- Trial or Paid,
// and (only meaningful for Paid) the agreed monthly price. Not a payment
// integration: this doesn't charge anything, it's a record of what's been
// agreed, the same way BillingSettings.cadence is a record rather than an
// invoicing engine. Organization carries no RLS (see UNSCOPED_MODELS in
// src/lib/prisma.ts), so this goes through the unscoped client directly,
// same as reading the list itself.
export async function updateOrganizationPlan(organizationId: string, formData: FormData) {
  await requirePlatformOwner();

  const plan = formData.get("plan");
  if (plan !== "TRIAL" && plan !== "PAID") throw new Error("Choose Trial or Paid");

  const rawPrice = str(formData, "monthlyPriceGBP");
  let monthlyPriceGBP: number | null = null;
  if (plan === "PAID") {
    const parsed = rawPrice !== null ? Number.parseFloat(rawPrice) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Enter a monthly price of 0 or more");
    }
    monthlyPriceGBP = parsed;
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan: plan as OrganizationPlan,
      // Only overwritten when moving to Paid -- moving back to Trial keeps
      // whatever price was last agreed, so re-enabling Paid later doesn't
      // need it typed in again.
      ...(plan === "PAID" ? { monthlyPriceGBP } : {}),
    },
  });

  revalidatePath("/owner");
}
