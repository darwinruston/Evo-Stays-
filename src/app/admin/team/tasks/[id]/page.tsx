import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { formatDateOnly, formatDateTime, toDateInputValue } from "@/lib/dateOnly";
import { isOverdue } from "@/lib/tasks";
import { Avatar } from "@/components/Avatar";
import { TaskCommentForm } from "@/components/TaskCommentForm";
import { TaskDetail } from "@/components/TaskDetail";
import { addTaskComment, deleteTask, setTaskStatus, updateTask } from "../actions";

export const metadata = { title: "Task" };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, db } = await requireStaff();
  const { id } = await params;

  const [task, people, propertyRows] = await Promise.all([
    db.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        completedBy: { select: { name: true } },
        property: { select: { id: true, nickname: true, name: true, address: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true } } },
        },
      },
    }),
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
  if (!task) notFound();

  const properties = propertyRows
    .map((p) => ({ id: p.id, name: propertyDisplayName(p) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const createdLine = `Created ${formatDateTime(task.createdAt)}${task.createdBy ? ` by ${task.createdBy.name}` : ""}`;
  const completedLine =
    task.status === "DONE" && task.completedAt
      ? `Completed ${formatDateTime(task.completedAt)}${task.completedBy ? ` by ${task.completedBy.name}` : ""}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/team/tasks" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Tasks
      </Link>

      <TaskDetail
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignee: task.assignedTo,
          dueLabel: task.dueOn ? formatDateOnly(task.dueOn) : null,
          overdue: isOverdue(task),
          property: task.property ? { id: task.property.id, name: propertyDisplayName(task.property) } : null,
          createdLine,
          completedLine,
          form: {
            title: task.title,
            description: task.description ?? "",
            priority: task.priority as string,
            assignedToId: task.assignedToId ?? "",
            dueOn: task.dueOn ? toDateInputValue(task.dueOn) : "",
            propertyId: task.propertyId ?? "",
          },
          canDelete: session.user.role === "ADMIN" || task.createdById === session.user.id,
        }}
        staff={people}
        properties={properties}
        setStatus={setTaskStatus.bind(null, task.id)}
        update={updateTask.bind(null, task.id)}
        remove={deleteTask.bind(null, task.id)}
      >
        <section className="flex flex-col gap-4" aria-labelledby="updates-heading">
          <h2 id="updates-heading" className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Updates{task.comments.length > 0 && ` (${task.comments.length})`}
          </h2>
          <TaskCommentForm action={addTaskComment.bind(null, task.id)} />
          {task.comments.length === 0 ? (
            <p className="text-sm text-zinc-500">No updates yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {task.comments.map((c) => {
                const author = c.author?.name ?? "Former team member";
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={author} size={32} />
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-black/[0.035] px-4 py-3">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-medium">{author}</span>
                        <span className="text-xs text-zinc-500">{formatDateTime(c.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </TaskDetail>
    </div>
  );
}
