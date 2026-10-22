import Link from "next/link";
import { requireLinen } from "@/lib/authz";
import { unreadNotificationCount } from "@/lib/notificationViews";
import { vapidPublicKey } from "@/lib/push";
import { DeviceSetupBanner } from "@/components/DeviceSetupBanner";
import { BellIcon } from "@/components/Icons";
import { EvoTick } from "@/components/EvoTick";
import { button } from "@/lib/ui";
import { logoutAction } from "../logout/actions";

// The linen company's own area: phone-first, a header and nothing else. It
// has no menu because it has one page.
export default async function LinenLayout({ children }: { children: React.ReactNode }) {
  const { session, db } = await requireLinen();
  const unread = await unreadNotificationCount(db, session.user.id);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center justify-between gap-4 px-4 py-3">
          <Link href="/linen" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/linen/notifications"
              aria-label={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950"
            >
              <BellIcon className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white">
                  {unread}
                </span>
              )}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={button("secondary", "sm")}>
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <div className="mb-4 empty:hidden">
          <DeviceSetupBanner publicKey={vapidPublicKey()} />
        </div>
        {children}
      </main>
    </div>
  );
}
