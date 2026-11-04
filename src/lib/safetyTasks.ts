import type { TaskPriority } from "@prisma/client";
import type { ScopedPrismaClient } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { TASK_TITLE_MAX } from "@/lib/tasks";

// The task made when a health and safety check comes due, for the team to pick
// up. Worked out in one place so the reminder timer and the property page
// agree on wording and importance.
export function safetyTaskFields(args: {
  checkTitle: string;
  propertyName: string;
  overdue: boolean;
  daysLeft: number;
}): { title: string; description: string; priority: TaskPriority } {
  const title = args.overdue
    ? `${args.checkTitle} overdue at ${args.propertyName}`
    : `${args.checkTitle} due at ${args.propertyName}`;
  return {
    title: title.length > TASK_TITLE_MAX ? `${title.slice(0, TASK_TITLE_MAX - 3)}...` : title,
    description:
      "Arrange it, then open the property's Health & safety tab to record the date it was completed and upload the certificate. This task closes itself once the new date is recorded.",
    // Overdue, or about to be, is worth chasing; further off is ordinary work.
    priority: args.overdue || args.daysLeft <= 7 ? "HIGH" : "NORMAL",
  };
}

// Closes the open task(s) for a check: the new date has been recorded (or the
// check turned out not to apply), so there is nothing left to pick up. Marked
// done rather than deleted, so the history stays.
export async function closeSafetyTasks(
  db: ScopedPrismaClient,
  checkId: string,
  actor: { id: string; name: string } | null,
  why: string,
): Promise<number> {
  const open = await db.task.findMany({
    where: { safetyCheckId: checkId, status: { not: "DONE" } },
    select: { id: true, title: true },
  });
  if (open.length === 0) return 0;

  await db.task.updateMany({
    where: { id: { in: open.map((t) => t.id) } },
    data: { status: "DONE", completedAt: new Date(), completedById: actor?.id ?? null },
  });
  for (const task of open) {
    await logAudit(db, {
      actorId: actor?.id ?? null,
      entityType: "Task",
      entityId: task.id,
      summary: `"${task.title}" closed automatically: ${why}`,
    });
  }
  return open.length;
}
