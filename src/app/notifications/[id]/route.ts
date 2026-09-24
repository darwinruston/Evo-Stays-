import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notificationsHref } from "@/lib/notificationViews";

// Following a notification: mark it read, then land wherever it points. A
// GET rather than a server action so each notification (in the list, or an
// email's link back into the app) is a plain link. Linked with <a>, not
// <Link>, in NotificationList -- <Link> prefetches, which would mark every
// notification on screen as read just by showing it.
//
// Scoped to the caller: someone else's notification id simply doesn't
// match, and falls through to their own list rather than confirming it
// exists.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.nextUrl));

  const { id } = await params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, href: true, readAt: true },
  });

  if (notification && !notification.readAt) {
    await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  }

  // href is only ever written by src/lib/notify.ts, but it's still checked
  // to be a same-site path rather than trusted -- an absolute or
  // protocol-relative value would make this an open redirect.
  const href = notification?.href;
  const target =
    href && href.startsWith("/") && !href.startsWith("//") ? href : notificationsHref(session.user.role);
  return NextResponse.redirect(new URL(target, req.nextUrl));
}
