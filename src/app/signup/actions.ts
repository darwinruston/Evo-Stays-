"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { authPrisma, prisma, scopedDb } from "@/lib/prisma";

const TRIAL_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// The public counterpart to createOrganization in src/app/owner/actions.ts
// -- same shape (a new Organization plus its first admin login, created
// together), but reachable by anyone, with no requirePlatformOwner gate,
// and automatically on a 14-day trial with that end date actually set
// (createOrganization leaves trialEndsAt for the owner to set by hand,
// since an owner-created account might be a real negotiated deal from day
// one -- a stranger signing themselves up always starts on the same clock).
// Signs the new admin straight in afterwards, so "sign up" and "sign in"
// aren't two separate steps.
export async function signUp(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const orgName = str(formData, "orgName");
  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!orgName) return "Company name is required.";
  if (!name || !email || !password) return "Name, email and password are all required.";
  if (password.length < 8) return "Password must be at least 8 characters.";

  // authPrisma, not the raw client -- same cross-tenant-before-we-know-the-
  // organization lookup as auth.ts's login and forgot-password's own email
  // check (see the comment on the evo_auth role in the
  // 20260930150000_auth_lookup_role migration). Email is globally unique
  // platform-wide (see the User model comment in schema.prisma), so this
  // has to catch a clash with ANY organization, not just a brand new one
  // that has no users yet to clash with.
  const existing = await authPrisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return "That email address already has an account — sign in instead.";

  // Organization carries no RLS (see UNSCOPED_MODELS in src/lib/prisma.ts),
  // so this is created via the raw client directly, same as
  // createOrganization.
  const organization = await prisma.organization.create({
    data: { name: orgName, trialEndsAt: new Date(Date.now() + TRIAL_LENGTH_MS) },
  });
  const db = scopedDb(organization.id);

  await db.user.create({
    data: {
      organizationId: organization.id,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account exists either way at this point -- send them to sign in
      // by hand rather than leaving the signup form looking like it failed.
      redirect("/login");
    }
    throw error;
  }
}
