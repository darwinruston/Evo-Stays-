import Link from "next/link";
import { requireLinen } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { button } from "@/lib/ui";
import { logoutAction } from "../logout/actions";

// The linen company's own area: phone-first, a header and nothing else. It
// has no menu because it has one page.
export default async function LinenLayout({ children }: { children: React.ReactNode }) {
  await requireLinen();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center justify-between gap-4 px-4 py-3">
          <Link href="/linen" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={button("secondary", "sm")}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(3rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
