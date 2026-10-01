import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Evo Stays home">
            <EvoTick className="h-9 w-auto" />
          </Link>
        </div>
        <div className={card("p-6 sm:p-8")}>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Enter the email you sign in with and we&apos;ll send a link to set a new password.
          </p>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/login" className="underline underline-offset-2 hover:text-zinc-900">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
