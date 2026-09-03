import { LoginForm } from "./LoginForm";
import { EvoTick } from "@/components/EvoTick";
import { ThemeToggle } from "@/components/ThemeToggle";
import { card } from "@/lib/ui";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <ThemeToggle className="absolute top-4 right-4 sm:top-6 sm:right-6" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <EvoTick className="h-9 w-auto" />
        </div>
        <div className={card("p-6 sm:p-8")}>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mb-6 text-sm text-zinc-500">Evo Stays</p>
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
        </div>
      </div>
    </main>
  );
}
