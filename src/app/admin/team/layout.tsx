import { requireStaff } from "@/lib/authz";
import { TeamTabs } from "@/components/TeamTabs";

// The two halves of the Team area, People and Tasks, under one set of tabs.
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const { session, db } = await requireStaff();
  const openTasks = await db.task.count({ where: { assignees: { some: { userId: session.user.id } }, status: { not: "DONE" } } });

  return (
    <div className="flex flex-col gap-6">
      <TeamTabs openTasks={openTasks} />
      {children}
    </div>
  );
}
