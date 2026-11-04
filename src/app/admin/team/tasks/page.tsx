import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { formatDateOnly } from "@/lib/dateOnly";
import { isOverdue, sortTasks } from "@/lib/tasks";
import { NewTask } from "@/components/TaskForm";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskRow } from "@/components/TaskRow";
import { createTask } from "./actions";

export const metadata = { title: "Tasks" };

// A long list of finished tasks isn't what anyone opens this page for.
const DONE_LIMIT = 100;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; show?: string }>;
}) {
  const { session, db } = await requireStaff();
  const { who: whoParam, show: showParam } = await searchParams;

  const [people, propertyRows] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.property.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, name: true, address: true },
    }),
  ]);
  const properties = propertyRows
    .map((p) => ({ id: p.id, name: propertyDisplayName(p) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // "me" unless the address says otherwise; an unknown value falls back to it.
  const who = whoParam === "all" || whoParam === "none" || people.some((p) => p.id === whoParam) ? whoParam! : "me";
  const show = showParam === "done" || showParam === "all" ? showParam : "open";

  const tasks = await db.task.findMany({
    where: {
      ...(who === "me" ? { assignedToId: session.user.id } : who === "none" ? { assignedToId: null } : who === "all" ? {} : { assignedToId: who }),
      ...(show === "open" ? { status: { not: "DONE" as const } } : show === "done" ? { status: "DONE" as const } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      property: { select: { id: true, nickname: true, name: true, address: true } },
      _count: { select: { comments: true } },
    },
    ...(show === "done" ? { orderBy: { completedAt: "desc" as const }, take: DONE_LIMIT } : {}),
  });

  const now = new Date();
  const rows = sortTasks(tasks).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    assignee: t.assignedTo,
    dueLabel: t.dueOn ? formatDateOnly(t.dueOn) : null,
    overdue: isOverdue(t, now),
    propertyName: t.property ? propertyDisplayName(t.property) : null,
    commentCount: t._count.comments,
  }));

  const emptyText =
    show === "done"
      ? "Nothing finished yet."
      : who === "me"
        ? "Nothing to do. Add a task, or look at everyone's from the filter above."
        : "No tasks here.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Work for the team that isn&apos;t a clean: give it to someone and say how important it is. Open a task to
            add updates and mark it complete. They are told when you give them one.
          </p>
        </div>
        <div>
          <NewTask action={createTask} staff={people} properties={properties} defaultAssigneeId={session.user.id} />
        </div>
      </div>

      <TaskFilters people={people} />

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {rows.map((row) => (
            <TaskRow key={row.id} task={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
