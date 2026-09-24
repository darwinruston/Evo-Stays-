import { requireCleaner } from "@/lib/authz";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function CleanerNotificationsPage() {
  const session = await requireCleaner();
  return <NotificationsView userId={session.user.id} />;
}
