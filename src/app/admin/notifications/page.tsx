import { requireStaff } from "@/lib/authz";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const session = await requireStaff();
  return <NotificationsView userId={session.user.id} />;
}
