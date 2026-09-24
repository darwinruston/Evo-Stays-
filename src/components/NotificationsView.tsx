import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email";
import { formatScheduledFor } from "@/lib/schedule";
import { button, card } from "@/lib/ui";
import { markAllNotificationsRead, setEmailNotifications } from "@/app/notifications/actions";
import { unreadNotificationCount } from "@/lib/notificationViews";

// How far back the list goes. Notifications are "what changed that affects
// you" -- nobody scrolls back through months of them, and older ones are
// still in the Activity log for anything that needs digging up.
const LIST_LIMIT = 50;

// The whole Notifications page body, shared by /admin/notifications and
// /cleaner/notifications -- the only difference between the two is which
// layout wraps it, so the page files are just a heading and this.
export async function NotificationsView({ userId }: { userId: string }) {
  const [notifications, user, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailNotifications: true, email: true } }),
    // Counted across ALL of them, not just the LIST_LIMIT shown -- the same
    // number as the nav badge, so "Mark all as read" is always there to
    // clear it, even when the unread ones have scrolled out of the list.
    unreadNotificationCount(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight sm:text-2xl">Notifications</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className={button("secondary", "sm")}>
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nothing yet — you&apos;ll see changes to your cleans here as they happen.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              {/* A plain <a>, not <Link> -- see src/app/notifications/[id]/route.ts
                  for why prefetching this would be wrong. */}
              <a
                href={`/notifications/${n.id}`}
                className={card("flex items-start gap-3 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-zinc-900"}`}
                />
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className={n.readAt ? "text-zinc-600" : "font-medium text-zinc-900"}>
                    {!n.readAt && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-zinc-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-zinc-400">{formatScheduledFor(n.createdAt)}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className={card("flex flex-col gap-2 p-4")}>
        <h2 className="text-sm font-medium">Email</h2>
        {/* Always offered, even before SMTP is set up -- the default is on,
            so someone who doesn't want email can opt out ahead of time
            rather than finding out the day it's switched on. */}
        <form action={setEmailNotifications} className="flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={user.emailNotifications}
              className="mt-0.5 h-4 w-4 accent-zinc-900"
            />
            <span className="min-w-0 [overflow-wrap:anywhere]">Also email these to {user.email}</span>
          </label>
          {!emailConfigured() && (
            <p className="text-xs text-zinc-500">
              Email isn&apos;t set up on this server yet — this takes effect once it is.
            </p>
          )}
          <button type="submit" className={`w-fit ${button("secondary", "sm")}`}>
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
