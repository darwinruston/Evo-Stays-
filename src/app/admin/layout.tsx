import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { NavMenu } from "@/components/NavMenu";
import { logoutAction } from "../logout/actions";

// Day-to-day work areas -- left, right after the logo. Overview isn't
// listed here: the logo already links to /admin, so it's reachable without
// taking up a nav slot of its own.
const NAV = [
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/cleans", label: "Cleans" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/laundry", label: "Laundry" },
];

// Clients and Cleaners are directories of people/organisations, not daily
// tools -- grouped off on the right so the left stays purely operational.
const PROFILE_NAV = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/cleaners", label: "Cleaners" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center gap-6 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/admin" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <NavMenu items={NAV} rightItems={PROFILE_NAV} logoutAction={logoutAction} />
        </nav>
      </header>
      <main className="px-4 py-10 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
