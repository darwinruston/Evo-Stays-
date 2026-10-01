import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const { callbackUrl, reset } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Evo Stays home">
            <EvoTick className="h-9 w-auto" />
          </Link>
        </div>
        <div className={card("p-6 sm:p-8")}>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mb-6 text-sm text-zinc-500">Evo Stays</p>
          {reset === "success" && (
            <p className="mb-4 rounded-md bg-black/[0.03] px-3 py-2 text-sm text-zinc-700">
              Password updated — sign in with your new one.
            </p>
          )}
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
        </div>
      </div>
    </main>
  );
}
