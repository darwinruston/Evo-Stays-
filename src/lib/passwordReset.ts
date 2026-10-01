import { randomBytes, createHash } from "crypto";

// Long enough that guessing one is infeasible; the token itself is the only
// thing standing between whoever has this link and a password change -- see
// the model comment on PasswordResetToken in schema.prisma.
const TOKEN_BYTES = 32;
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

// Only this hash is ever stored -- the raw token in the emailed link never
// touches the database, so a leaked backup or dump can't be turned into a
// working reset link. Used identically when issuing a token and when
// verifying one, so the two always agree.
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
