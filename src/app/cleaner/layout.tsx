import Link from "next/link";
import { requireCleaner } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { NavMenu } from "@/components/NavMenu";
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
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center gap-4 px-4 py-3">
          <Link href="/cleaner" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <NavMenu items={NAV} logoutAction={logoutAction} />
        </nav>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
