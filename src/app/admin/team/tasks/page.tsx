import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { formatDateOnly } from "@/lib/dateOnly";
import { repeatPhrase } from "@/lib/taskRepeat";
import { isOverdue, sortTasks } from "@/lib/tasks";
import { TasksHeader } from "@/components/TaskForm";
import { TaskFilters } from "@/components/TaskFilters";
import { TASK_GRID, TaskRow } from "@/components/TaskRow";
import { card } from "@/lib/ui";
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
      ...(who === "me"
        ? { assignees: { some: { userId: session.user.id } } }
        : who === "none"
          ? { assignees: { none: {} } }
          : who === "all"
            ? {}
            : { assignees: { some: { userId: who } } }),
      ...(show === "open" ? { status: { not: "DONE" as const } } : show === "done" ? { status: "DONE" as const } : {}),
    },
    include: {
      assignees: { select: { user: { select: { id: true, name: true } } } },
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
    assignees: t.assignees.map((a) => a.user).sort((a, b) => a.name.localeCompare(b.name)),
    wholeTeam: people.length > 1 && t.assignees.length === people.length,
    dueLabel: t.dueOn ? formatDateOnly(t.dueOn) : null,
    overdue: isOverdue(t, now),
    propertyName: t.property ? propertyDisplayName(t.property) : null,
    repeatLabel: t.repeat ? repeatPhrase(t.repeat) : null,
    commentCount: t._count.comments,
  }));

  const emptyText =
    show === "done"
      ? "Nothing finished yet."
      : who === "me"
        ? "Nothing to do. Add a task, or look at everyone's from the filter above."
        : "No tasks here.";

  return (
    <div className="flex flex-col gap-8">
      <TasksHeader action={createTask} staff={people} properties={properties} defaultAssigneeId={session.user.id} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <TaskFilters people={people} />
          <p className="text-sm text-zinc-500">
            {rows.length} {rows.length === 1 ? "task" : "tasks"}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className={card("ring-1 ring-black/[0.04] px-6 py-12 text-center")}>
            <p className="text-sm text-zinc-500">{emptyText}</p>
          </div>
        ) : (
          <div className={card("overflow-hidden ring-1 ring-black/[0.04]")}>
            <div
              aria-hidden="true"
              className={`hidden items-center gap-x-4 border-b border-black/5 px-5 py-3 text-xs font-medium tracking-wide text-zinc-500 uppercase md:grid ${TASK_GRID}`}
            >
              <span />
              <span>Task</span>
              <span>Importance</span>
              <span>Assigned to</span>
              <span>Due</span>
              <span />
            </div>
            <ul className="divide-y divide-black/5">
              {rows.map((row) => (
                <TaskRow key={row.id} task={row} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
