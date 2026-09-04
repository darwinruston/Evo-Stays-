import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { NavMenu } from "@/components/NavMenu";
import { logoutAction } from "../logout/actions";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/cleans", label: "Cleans" },
  { href: "/admin/cleaners", label: "Cleaners" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/laundry", label: "Laundry" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative mx-auto flex max-w-5xl items-center gap-6 px-4 py-4 sm:px-6">
          <Link href="/admin" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <NavMenu items={NAV} logoutAction={logoutAction} />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
