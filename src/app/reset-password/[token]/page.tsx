import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/passwordReset";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";

export const metadata = { title: "Set a new password" };

// Checked here too, not just inside the action -- an expired or already-used
// link should say so straight away rather than only after someone fills in
// and submits a form that was always going to be rejected. The action
// re-checks regardless (a GET here isn't the authorization, same reasoning
// as every other server action in this app).
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  const valid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Evo Stays home">
            <EvoTick className="h-9 w-auto" />
          </Link>
        </div>
        <div className={card("p-6 sm:p-8")}>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Set a new password</h1>
          {valid ? (
            <>
              <p className="mb-6 text-sm text-zinc-500">Choose a new password for your account.</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-zinc-500">
                This reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password" className="text-sm underline underline-offset-2 hover:text-zinc-900">
                Request a new one
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
