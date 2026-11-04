import type { TaskRepeat } from "@prisma/client";
import { addMonths, todayDateOnly } from "@/lib/dateOnly";

export const TASK_REPEATS: TaskRepeat[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "SIX_MONTHLY", "YEARLY"];

// For the picker.
export const TASK_REPEAT_LABELS: Record<TaskRepeat, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Every 3 months",
  SIX_MONTHLY: "Every 6 months",
  YEARLY: "Yearly",
};

// For a sentence: "Repeats monthly".
const PHRASES: Record<TaskRepeat, string> = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  QUARTERLY: "every 3 months",
  SIX_MONTHLY: "every 6 months",
  YEARLY: "yearly",
};

export function repeatPhrase(repeat: TaskRepeat): string {
  return `Repeats ${PHRASES[repeat]}`;
}

export function isTaskRepeat(value: unknown): value is TaskRepeat {
  return typeof value === "string" && (TASK_REPEATS as string[]).includes(value);
}

const MONTHS_PER_STEP: Record<Exclude<TaskRepeat, "WEEKLY">, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SIX_MONTHLY: 6,
  YEARLY: 12,
};

// The due date `steps` repeats after `due`. Always counted from the original
// date rather than step by step, so a task due on the 31st doesn't drift
// earlier each month once a short month has clamped it.
function stepsAfter(due: Date, repeat: TaskRepeat, steps: number): Date {
  if (repeat === "WEEKLY") return new Date(due.getTime() + steps * 7 * 86_400_000);
  return addMonths(due, MONTHS_PER_STEP[repeat] * steps);
}

// When the next one is due: one repeat after this one's due date, or the first
// such date still to come if this one was finished long after it was due (a
// monthly task finished three months late is next due next month, not already
// two months overdue).
export function nextDueDate(due: Date, repeat: TaskRepeat, today = todayDateOnly()): Date {
  let steps = 1;
  let next = stepsAfter(due, repeat, steps);
  while (next.getTime() <= today.getTime() && steps < 2000) {
    steps += 1;
    next = stepsAfter(due, repeat, steps);
  }
  return next;
}
