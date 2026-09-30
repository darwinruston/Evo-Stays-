import Link from "next/link";
import { requirePlatformOwner } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { button } from "@/lib/ui";
import { logoutAction } from "../logout/actions";

// The platform owner's own area -- deliberately separate from /admin and
// /cleaner, not a page tucked inside either. This account manages the
// platform (which organizations exist, how much they're using, whether
// they're paying), it doesn't run a cleaning business inside Evo Stays the
// way every other account does, so there's no reason for it to carry
// Properties/Cleans/Stock/Invoices/Laundry navigation it will never use.
// Deliberately minimal for the same reason -- there's nothing here to
// navigate to yet beyond Organizations itself.
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformOwner();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/owner" aria-label="Evo Stays home" className="flex shrink-0 items-center gap-2.5">
            <EvoTick className="h-6 w-auto" />
            <span className="text-sm font-medium text-zinc-500">Platform</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={button("secondary", "sm")}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="px-4 pt-10 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
