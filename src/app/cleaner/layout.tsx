import Link from "next/link";
import { requireCleaner } from "@/lib/authz";
import { EvoTick } from "@/components/EvoTick";
import { NavMenu } from "@/components/NavMenu";
import { unreadNotificationCount } from "@/lib/notificationViews";
import { logoutAction } from "../logout/actions";

// Phone-first: this area is used on site, mid-turnaround.
const NAV = [
  { href: "/cleaner", label: "My cleans" },
  { href: "/cleaner/calendar", label: "Calendar" },
  { href: "/cleaner/properties", label: "Properties" },
  { href: "/cleaner/laundry", label: "Laundry" },
];

export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCleaner();
  const unread = await unreadNotificationCount(session.user.id);
  const items = [...NAV, { href: "/cleaner/notifications", icon: "bell" as const, label: "Notifications", count: unread, countLabel: "unread" }];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center gap-4 px-4 py-3">
          <Link href="/cleaner" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <NavMenu items={items} logoutAction={logoutAction} />
        </nav>
      </header>
      {/* Extra bottom padding, on top of the phone's own safe-area inset
          (real on a notched/gesture-bar phone now that layout.tsx declares
          viewport-fit=cover; 0 everywhere else) -- without it the last
          button on a page sat right at the screen edge, where a tap can
          land on the browser's own address/tab bar revealing itself
          instead of the button underneath it. This area is used one-handed
          mid-clean, so that's the button that matters most. */}
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
