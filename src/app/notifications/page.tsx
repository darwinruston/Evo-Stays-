import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { notificationsHref } from "@/lib/notificationViews";

// A role-neutral address for "your notifications" -- what notification
// emails link to, since one email template goes to cleaners and staff
// alike. Just forwards to the right area's own page.
export default async function NotificationsRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(notificationsHref(session.user.role));
}
