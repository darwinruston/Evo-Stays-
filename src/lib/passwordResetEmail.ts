import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured, absoluteUrl } from "@/lib/email";
import { generateResetToken, hashResetToken, PASSWORD_RESET_EXPIRY_MS } from "@/lib/passwordReset";

// Makes a one-use reset link for this person and emails it. Shared by the
// public "forgot password" page (src/app/forgot-password/actions.ts) and the
// profile page's own "email me a reset link", so both send the same message
// the same way.
export async function issuePasswordResetLink(user: { id: string; email: string; name: string }): Promise<void> {
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
        "If you didn't ask for this, you can ignore this email. Your password hasn't changed.",
      ].join("\n"),
    });
  } else {
    // No SMTP configured (e.g. local dev) -- logged instead of silently
    // going nowhere, so the flow is still testable without real email.
    console.log(`[password reset] ${user.email}: ${link}`);
  }
}
