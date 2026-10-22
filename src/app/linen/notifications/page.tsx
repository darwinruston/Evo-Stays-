import Link from "next/link";
import { requireLinen } from "@/lib/authz";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Alerts" };

export default async function LinenNotificationsPage() {
  const { session, db } = await requireLinen();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/linen" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Schedule
      </Link>
      <NotificationsView
        db={db}
        userId={session.user.id}
        emptyText="Nothing yet. You'll be told here if a clean is cancelled or moved, or a cleaner's arrival time changes."
      />
    </div>
  );
}
