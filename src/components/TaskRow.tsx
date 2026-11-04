import Link from "next/link";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, taskHref } from "@/lib/tasks";
import { badge } from "@/lib/ui";
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
  // "Repeats monthly", or null if it does not repeat.
  repeatLabel: string | null;
  commentCount: number;
};

// The columns of the list on a wide screen: status mark, task, importance, who
// has it, due, and the arrow. The heading row and every task use the same
// template so they line up. On a phone each task is a stacked card instead.
export const TASK_GRID = "md:grid-cols-[1.25rem_minmax(0,1fr)_5.5rem_12rem_8rem_1rem]";

// One task in the list. The whole row opens the task: that is where you read
// the notes, add an update, change it and complete it. Nothing here changes
// the task, so a stray tap can't finish or lose one.
export function TaskRow({ task }: { task: TaskRowData }) {
  const done = task.status === "DONE";

  return (
    <li>
      <Link
        href={taskHref(task.id)}
        className={`grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-black/[0.025] ${TASK_GRID} ${
          done ? "opacity-60" : ""
        }`}
      >
        <StatusMark status={task.status} />

        <div className="min-w-0">
          <p className={`font-medium [overflow-wrap:anywhere] ${done ? "line-through decoration-zinc-400" : ""}`}>{task.title}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
            {task.status === "IN_PROGRESS" && <span>{TASK_STATUS_LABELS.IN_PROGRESS}</span>}
            {task.propertyName && <span>{task.propertyName}</span>}
            {task.repeatLabel && <span>{task.repeatLabel}</span>}
            {task.commentCount > 0 && (
              <span>
                {task.commentCount} {task.commentCount === 1 ? "update" : "updates"}
              </span>
            )}
          </p>
        </div>

        {/* On a phone these three sit on one line under the title; on a wide screen they are columns. */}
        <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 md:contents md:text-sm md:text-zinc-900">
          <span>
            <span className={badge(task.priority === "URGENT" ? "solid" : task.priority === "HIGH" ? "outline" : "neutral")}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          </span>
          <span className="min-w-0 truncate">
            <TaskAssignees people={task.assignees} wholeTeam={task.wholeTeam} layout="inline" />
          </span>
          <span className={task.overdue ? "font-medium text-zinc-900" : task.dueLabel ? "" : "text-zinc-400"}>
            {task.dueLabel ? (task.overdue ? `Overdue, ${task.dueLabel}` : task.dueLabel) : "No due date"}
          </span>
        </div>

        <span aria-hidden="true" className="hidden text-zinc-400 md:block">
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
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-full border md:self-center ${
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
