import Link from "next/link";
import { requireClient } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { logoutAction } from "../logout/actions";

// Grows a link per phase (my properties, cleans, profile).
const NAV = [{ href: "/client", label: "My portfolio" }];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireClient();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link href="/client" aria-label="Evo Stays home">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
