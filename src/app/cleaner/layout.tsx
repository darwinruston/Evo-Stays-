import Link from "next/link";
import { requireCleaner } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { logoutAction } from "../logout/actions";

// Phone-first: this area is used on site, mid-turnaround.
const NAV = [
  { href: "/cleaner", label: "My cleans" },
  { href: "/cleaner/calendar", label: "Calendar" },
  { href: "/cleaner/properties", label: "Properties" },
  { href: "/cleaner/laundry", label: "Laundry" },
];

export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  await requireCleaner();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-black/5 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto sm:gap-3">
          <Link href="/cleaner" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md text-xs text-zinc-600 transition-colors hover:text-zinc-950 sm:px-3 sm:py-1.5 sm:text-sm sm:hover:bg-black/5"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <form action={logoutAction} className="shrink-0">
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-sm whitespace-nowrap text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
