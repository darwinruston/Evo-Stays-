"use server";

import { prisma, authPrisma } from "@/lib/prisma";
import { sendEmail, emailConfigured, absoluteUrl } from "@/lib/email";
import { generateResetToken, hashResetToken, PASSWORD_RESET_EXPIRY_MS } from "@/lib/passwordReset";

// Always the same message, whether or not that email actually has an
// account -- telling someone "no account with that email" would let anyone
// check which emails are registered, one guess at a time.
const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset the password.";

export async function requestPasswordReset(
  _prev: string | undefined,
  formData: FormData,
): Promise<string> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";
  if (!email) return "Enter your email address.";

  // authPrisma, not the raw client -- same reasoning as auth.ts's own login
  // lookup (see the comment there and on the evo_auth role in the
  // 20260930150000_auth_lookup_role migration): finding an account by email
  // alone, before anything is known about which organization it belongs to,
  // is a genuinely cross-tenant read, and User's RLS policy denies it
  // outright (its USING clause governs reads, not just writes) through any
  // client with no organization scope set, including the plain `prisma`
  // singleton.
  const user = await authPrisma.user.findUnique({ where: { email } });

  if (user) {
    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);

    // Any previous unused token for this user is replaced, not left to
    // linger -- only the most recent request should ever work.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS) },
    });

    const path = `/reset-password/${rawToken}`;
    const link = absoluteUrl(path) ?? path;

    if (emailConfigured()) {
      await sendEmail({
        to: user.email,
        subject: "Reset your Evo Stays password",
        text: [
          `Hi ${user.name},`,
          "",
          "Someone (hopefully you) asked to reset your Evo Stays password.",
          "This link works once and expires in an hour:",
          "",
          link,
          "",
          "If you didn't ask for this, you can ignore this email — your password hasn't changed.",
        ].join("\n"),
      });
    } else {
      // No SMTP configured (e.g. local dev) -- logged instead of silently
      // going nowhere, so the flow is still testable without real email.
      console.log(`[password reset] ${user.email}: ${link}`);
    }
  }

  return GENERIC_MESSAGE;
}
