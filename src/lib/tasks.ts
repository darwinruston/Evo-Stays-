import type { TaskPriority, TaskStatus } from "@prisma/client";
import { todayDateOnly } from "@/lib/dateOnly";

// Most important first: the order the picker lists them in and the order open
// tasks are sorted in.
export const TASK_PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 2000;
export const TASK_COMMENT_MAX = 2000;
export const SUBTASK_TITLE_MAX = 200;
// A checklist this long is really several tasks.
export const SUBTASKS_MAX = 60;

export function taskHref(id: string): string {
  return `/admin/team/tasks/${id}`;
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && (TASK_PRIORITIES as string[]).includes(value);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as string[]).includes(value);
}

type Sortable = {
  priority: TaskPriority;
  status: TaskStatus;
  dueOn: Date | null;
  createdAt: Date;
  completedAt: Date | null;
};

// Open tasks by importance, then the soonest due date (no date last), then
// oldest first. Finished tasks, most recently finished first.
export function sortTasks<T extends Sortable>(tasks: T[]): T[] {
  const rank = (p: TaskPriority) => TASK_PRIORITIES.indexOf(p);
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "DONE";
    const bDone = b.status === "DONE";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
    if (a.priority !== b.priority) return rank(a.priority) - rank(b.priority);
    const aDue = a.dueOn?.getTime() ?? Infinity;
    const bDue = b.dueOn?.getTime() ?? Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// Past its due date and not finished.
export function isOverdue(task: { status: TaskStatus; dueOn: Date | null }, now = new Date()): boolean {
  return task.status !== "DONE" && task.dueOn !== null && task.dueOn.getTime() < todayDateOnly(now).getTime();
}
