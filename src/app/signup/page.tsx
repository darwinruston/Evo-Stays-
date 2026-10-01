import Link from "next/link";
import { SignUpForm } from "./SignUpForm";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";

export const metadata = { title: "Start your free trial" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Evo Stays home">
            <EvoTick className="h-9 w-auto" />
          </Link>
        </div>
        <div className={card("p-6 sm:p-8")}>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Start your free trial</h1>
          <p className="mb-6 text-sm text-zinc-500">
            14 days, full access, no card required. You&apos;re the first admin login — add your
            own staff, clients and properties once you&apos;re in.
          </p>
          <SignUpForm />
          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-zinc-900">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
