import Link from "next/link";
import { RegisterInterestForm } from "./RegisterInterestForm";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";

export const metadata = { title: "Register interest" };

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
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Register your interest</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Evo Stays isn&apos;t open for sign-ups just yet. Leave your details and we&apos;ll reach out
            to set up a demo as soon as it&apos;s ready.
          </p>
          <RegisterInterestForm />
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
