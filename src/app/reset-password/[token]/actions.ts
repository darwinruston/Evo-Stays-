"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma, authPrisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/passwordReset";

export async function resetPassword(
  token: string,
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirmPassword) {
    return "Those passwords don't match.";
  }

  // No RLS on PasswordResetToken (see UNSCOPED_MODELS in src/lib/prisma.ts),
  // so the raw client reads it directly.
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return "This reset link is invalid or has expired — request a new one.";
  }

  // authPrisma to find which organization this user belongs to (the same
  // cross-tenant-before-we-know-the-organization shape as the request step
  // in ../../forgot-password/actions.ts), so the actual password write
  // below can go through properly scoped -- User does carry RLS, and its
  // WITH CHECK would otherwise reject the update outright.
  const user = await authPrisma.user.findUniqueOrThrow({ where: { id: resetToken.userId } });
  const passwordHash = await bcrypt.hash(password, 10);

  // The password change and marking the token used need to succeed
  // together -- same atomicity note as adjustInvoiceLineHours in
  // src/app/admin/invoices/actions.ts: the scoped client can't provide a
  // real interactive transaction (each of its calls opens its own, to
  // carry the set_config), so this falls back to the raw client's own
  // $transaction, setting the RLS session variable by hand.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${user.organizationId}, TRUE)`;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
  });

  redirect("/login?reset=success");
}
