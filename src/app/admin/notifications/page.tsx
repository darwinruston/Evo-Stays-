import { requireStaff } from "@/lib/authz";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const { session, db } = await requireStaff();
  return <NotificationsView db={db} userId={session.user.id} />;
}
