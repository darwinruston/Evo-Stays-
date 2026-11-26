"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma, authPrisma, scopedDb } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hashResetToken } from "@/lib/passwordReset";

const DEAD_LINK = "This invite link has expired or has already been used. Ask for a new one.";

// The person who was invited sets their name and password, then is signed in.
// Public on purpose: the link itself is what proves who they are.
export async function acceptInvite(token: string, _prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!name) return "Enter your name.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirm) return "Those passwords don't match.";

  const invite = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return DEAD_LINK;

  // authPrisma: which company they belong to isn't known until we've found
  // them (see the same step in the password reset action).
  const user = await authPrisma.user.findUnique({ where: { id: invite.userId } });
  if (!user?.invitePending) return DEAD_LINK;
  const passwordHash = await bcrypt.hash(password, 10);

  // Claiming the token inside the transaction means two submissions of the
  // same link cannot both set a password.
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${user.organizationId}, TRUE)`;
    const used = await tx.passwordResetToken.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) return false;
    await tx.user.update({ where: { id: user.id }, data: { name, passwordHash, invitePending: false } });
    return true;
  });
  if (!claimed) return DEAD_LINK;

  await logAudit(scopedDb(user.organizationId), {
    actorId: user.id,
    entityType: "Staff",
    entityId: user.id,
    summary: `${name} accepted their invite and set a password`,
  });

  try {
    await signIn("credentials", { email: user.email, password, redirectTo: "/" });
  } catch (error) {
    // Their password is set either way: if signing in straight off fails, the
    // sign-in page is the next best place.
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}
