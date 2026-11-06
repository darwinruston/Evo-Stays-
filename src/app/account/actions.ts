"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn, DEMO_PASSWORD } from "@/auth";
import { authPrisma, scopedDb } from "@/lib/prisma";
import { clientIp, isLoginBlocked, recordLoginFailure } from "@/lib/loginRateLimit";
import { issuePasswordResetLink } from "@/lib/passwordResetEmail";
import { logAudit } from "@/lib/audit";
import { deleteProfilePhoto, saveProfilePhoto } from "@/lib/profilePhotos";
import { PASSWORD_MIN_LENGTH, PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_TYPES, profilePath } from "@/lib/profile";
import { revalidatePath } from "next/cache";

// A person changing their own password from their profile page. They must
// give the current one first, so a phone left unlocked on the profile page
// can't be used to take over the account, and wrong guesses count towards the
// same lockout as signing in (see src/lib/loginRateLimit.ts).
//
// Saving signs every other device out (sessionVersion, see src/auth.ts) and
// then signs this one straight back in with the new password, so the person
// carries on where they were. Returns a reason they can fix; on success it
// redirects, so it never returns.
export async function changeOwnPassword(formData: FormData): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) return "Please sign in again.";
  // Support staff viewing a company as its admin (see src/app/impersonation/)
  // must not be able to change that admin's password from here.
  if (session.user.impersonatedBy) return "A password can't be changed while viewing as support.";

  const current = formData.get("currentPassword");
  const next = formData.get("password");
  const confirm = formData.get("confirmPassword");
  if (typeof current !== "string" || current === "") return "Enter your current password.";
  if (typeof next !== "string" || next.length < PASSWORD_MIN_LENGTH) {
    return `The new password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (next !== confirm) return "The new passwords don't match.";
  if (next === current) return "Choose a different password to your current one.";
  if (next === DEMO_PASSWORD) return "That password is too easy to guess. Choose another.";

  const email = session.user.email;
  if (!email) return "Please sign in again.";
  const ip = clientIp(await headers());
  if (isLoginBlocked(email, ip)) return "Too many failed attempts. Wait 15 minutes and try again.";

  // authPrisma: the cross-tenant lookup the login itself uses (see
  // src/auth.ts). The write below goes through the properly scoped client.
  const user = await authPrisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    recordLoginFailure(email, ip);
    return "That isn't your current password.";
  }

  const db = scopedDb(user.organizationId);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 } },
  });
  await logAudit(db, {
    actorId: user.id,
    entityType: "Staff",
    entityId: user.id,
    summary: "Changed their own password",
  });

  try {
    await signIn("credentials", { email: user.email, password: next, redirectTo: `${profilePath(user.role)}?changed=1` });
  } catch (error) {
    // The password is changed; only the automatic sign-back-in failed.
    if (error instanceof AuthError) return "Your password was changed. Please sign in again with the new one.";
    // A successful sign-in redirects, which is thrown: let it through.
    throw error;
  }
}

// "Email me a reset link", for someone who has forgotten the current password
// and so can't use the form above. Goes to the address on the account, never
// one typed in, so it can't be pointed anywhere else.
export async function sendOwnResetLink(): Promise<string> {
  const session = await auth();
  if (!session?.user) return "Please sign in again.";
  if (session.user.impersonatedBy) return "A password can't be reset while viewing as support.";

  const user = await authPrisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return "Please sign in again.";
  await issuePasswordResetLink(user);
  return `We've sent a reset link to ${user.email}. It works once and expires in an hour.`;
}

// Puts a photo on the signed-in person's own profile. The page shrinks and
// crops it to a small square first (see ProfilePhotoForm), so what arrives
// here is a modest JPEG, PNG or WebP; anything else is refused. The old photo
// file is removed once the new one is saved.
export async function uploadProfilePhoto(formData: FormData): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in again." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return { error: "That photo is too large. Try a smaller one." };

  const db = scopedDb(session.user.organizationId);
  const before = await db.user.findUnique({ where: { id: session.user.id }, select: { photoPath: true } });
  if (!before) return { error: "Please sign in again." };

  const photoPath = await saveProfilePhoto(session.user.id, file);
  await db.user.update({ where: { id: session.user.id }, data: { photoPath } });
  if (before.photoPath) await deleteProfilePhoto(before.photoPath);

  // The photo is in every page's top bar.
  revalidatePath("/", "layout");
}

export async function removeProfilePhoto(): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in again." };

  const db = scopedDb(session.user.organizationId);
  const before = await db.user.findUnique({ where: { id: session.user.id }, select: { photoPath: true } });
  if (!before?.photoPath) return;

  await db.user.update({ where: { id: session.user.id }, data: { photoPath: null } });
  await deleteProfilePhoto(before.photoPath);

  revalidatePath("/", "layout");
}
