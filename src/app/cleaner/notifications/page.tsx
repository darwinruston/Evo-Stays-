import { requireCleaner } from "@/lib/authz";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function CleanerNotificationsPage() {
  const { session, db } = await requireCleaner();
  return <NotificationsView db={db} userId={session.user.id} />;
}
