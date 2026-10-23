import Link from "next/link";
import { EvoTick } from "@/components/EvoTick";
import { NAV_LINKS } from "@/lib/site";
import { button } from "@/lib/ui";

// The top bar on every public page. On a wide screen the links sit in the bar;
// on a phone they fold into a menu (a plain <details>, so it needs no script).
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
        <Link href="/" aria-label="Evo Stays home" className="shrink-0">
          <EvoTick className="h-7 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-zinc-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={`hidden sm:inline-flex ${button("ghost", "sm")}`}>
            Sign in
          </Link>
          <Link href="/signup" className={button("primary", "sm")}>
            Register interest
          </Link>

          <details className="group relative md:hidden">
            <summary
              aria-label="Menu"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-zinc-700 hover:bg-black/5 [&::-webkit-details-marker]:hidden"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" className="group-open:hidden" />
                <path d="M5 5l10 10M15 5L5 15" className="hidden group-open:block" />
              </svg>
            </summary>
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-black/10 bg-surface p-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]">
              <nav aria-label="Menu" className="flex flex-col text-sm font-medium text-zinc-700">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 hover:bg-black/[0.04]">
                    {link.label}
                  </Link>
                ))}
                <Link href="/login" className="rounded-lg px-3 py-2.5 hover:bg-black/[0.04]">
                  Sign in
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
