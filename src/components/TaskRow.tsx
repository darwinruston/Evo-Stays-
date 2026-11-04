import Link from "next/link";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, taskHref } from "@/lib/tasks";
import { badge, card } from "@/lib/ui";
import { TaskAssignees } from "@/components/TaskAssignees";

export type TaskRowData = {
  id: string;
  title: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignees: { id: string; name: string }[];
  // Everyone in the team is on it.
  wholeTeam: boolean;
  // Already formatted on the server ("12 Nov 25"), so no date logic here.
  dueLabel: string | null;
  overdue: boolean;
  propertyName: string | null;
  commentCount: number;
};

// One task in the list. The whole card opens the task: that is where you read
// the notes, add an update, change it and complete it. Nothing here changes
// the task, so a stray tap can't finish or lose one.
export function TaskRow({ task }: { task: TaskRowData }) {
  const done = task.status === "DONE";

  return (
    <li>
      <Link
        href={taskHref(task.id)}
        className={card(
          `flex items-start gap-3 p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_36px_-16px_rgba(0,0,0,0.2)] ${done ? "opacity-70" : ""}`,
        )}
      >
        <StatusMark status={task.status} />
        <div className="min-w-0 flex-1">
          <p className={`font-medium [overflow-wrap:anywhere] ${done ? "line-through" : ""}`}>{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
            <span className={badge(task.priority === "URGENT" ? "solid" : task.priority === "HIGH" ? "outline" : "neutral")}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {task.status === "IN_PROGRESS" && <span>{TASK_STATUS_LABELS.IN_PROGRESS}</span>}
            <TaskAssignees people={task.assignees} wholeTeam={task.wholeTeam} layout="inline" />
            {task.dueLabel && (
              <span className={task.overdue ? "font-medium text-zinc-900" : ""}>
                {task.overdue ? "Overdue, was due" : "Due"} {task.dueLabel}
              </span>
            )}
            {task.propertyName && <span>{task.propertyName}</span>}
            {task.commentCount > 0 && (
              <span>
                {task.commentCount} {task.commentCount === 1 ? "update" : "updates"}
              </span>
            )}
          </div>
        </div>
        <span aria-hidden="true" className="mt-0.5 text-zinc-400">
          →
        </span>
      </Link>
    </li>
  );
}

// A small picture of where the task is: empty, half full or ticked. Not a
// button.
export function StatusMark({ status }: { status: TaskRowData["status"] }) {
  const done = status === "DONE";
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        done ? "border-zinc-900 bg-zinc-900 text-white" : status === "IN_PROGRESS" ? "border-zinc-900" : "border-zinc-300"
      }`}
    >
      {done && (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3">
          <path d="M4 10.5 8 14l8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "IN_PROGRESS" && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
    </span>
  );
}
