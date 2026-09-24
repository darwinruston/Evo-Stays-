import { prisma } from "@/lib/prisma";

// Which area's Notifications page a user reads -- the same split "/" uses to
// route a signed-in user (see src/app/page.tsx). Takes a plain string since
// that's how the session carries the role (see src/types/next-auth.d.ts).
export function notificationsHref(role: string): string {
  return role === "CLEANER" ? "/cleaner/notifications" : "/admin/notifications";
}

// For the nav badge in both area layouts.
export function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
