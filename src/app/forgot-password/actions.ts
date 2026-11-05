"use server";

import { authPrisma } from "@/lib/prisma";
import { issuePasswordResetLink } from "@/lib/passwordResetEmail";

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
  // alone, before anything is known about which organisation it belongs to,
  // is a genuinely cross-tenant read, and User's RLS policy denies it
  // outright (its USING clause governs reads, not just writes) through any
  // client with no organisation scope set, including the plain `prisma`
  // singleton.
  const user = await authPrisma.user.findUnique({ where: { email } });

  if (user) await issuePasswordResetLink(user);

  return GENERIC_MESSAGE;
}
