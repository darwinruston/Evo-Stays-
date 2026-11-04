import type { ScopedPrismaClient } from "@/lib/prisma";
import { notify, type NotificationInput } from "@/lib/notify";
import { propertyDisplayName } from "@/lib/address";
import { daysBetween, formatDateOnly, todayDateOnly } from "@/lib/dateOnly";
import { TASK_PRIORITY_LABELS, taskHref } from "@/lib/tasks";

// Reminders go out in the daytime only. The timer runs every ten minutes round
// the clock, and a phone buzzing at ten past midnight because something is due
// tomorrow helps nobody: anything that comes due overnight waits for the
// morning.
const FIRST_HOUR = 8;
const LAST_HOUR = 21;

function ukHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(now)
    .find((p) => p.type === "hour")?.value;
  return Number(hour);
}

// Run on the same timer as the other background checks (see
// src/lib/syncScheduler.ts). Tells the people a task is with:
//
//  - once, the day before it is due (or on the day, for a task that only just
//    came into range), and
//  - once more if it passes its due date without being finished.
//
// A task with nobody on it reminds whoever created it, so it isn't forgotten.
// Changing the due date clears both (see updateTask), so the new date reminds
// afresh. Tasks made from a health and safety date are left out: they follow
// that check's own three reminders (src/lib/safetyReminders.ts). Returns how
// many tasks it flagged.
export async function checkTaskReminders(db: ScopedPrismaClient, now = new Date()): Promise<number> {
  const hour = ukHour(now);
  if (hour < FIRST_HOUR || hour >= LAST_HOUR) return 0;

  const today = todayDateOnly(now);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const tasks = await db.task.findMany({
    where: {
      status: { not: "DONE" },
      safetyCheckId: null,
      dueOn: { not: null, lte: tomorrow },
      OR: [{ dueSoonNotifiedAt: null }, { overdueNotifiedAt: null }],
    },
    select: {
      id: true,
      title: true,
      priority: true,
      dueOn: true,
      createdAt: true,
      createdById: true,
      dueSoonNotifiedAt: true,
      overdueNotifiedAt: true,
      assignees: { select: { userId: true } },
      property: { select: { nickname: true, name: true, address: true } },
    },
  });

  const notices: NotificationInput[] = [];
  let flagged = 0;
  for (const task of tasks) {
    if (!task.dueOn) continue;
    const days = daysBetween(today, task.dueOn);
    const recipients = task.assignees.length > 0 ? task.assignees.map((a) => a.userId) : task.createdById ? [task.createdById] : [];

    if (days < 0) {
      if (task.overdueNotifiedAt) continue;
      // Marked before sending, as the other checks do, so a slow send can't
      // let the next pass tell everyone twice. An overdue task counts as
      // having had the earlier reminder too.
      await db.task.update({ where: { id: task.id }, data: { overdueNotifiedAt: now, dueSoonNotifiedAt: now } });
      flagged += 1;
      notices.push(
        ...recipients.map((userId) => ({
          userId,
          kind: "TASK_DUE" as const,
          title: `Overdue: ${task.title}`,
          body: `It was due on ${formatDateOnly(task.dueOn!)}.`,
          href: taskHref(task.id),
        })),
      );
      continue;
    }

    if (task.dueSoonNotifiedAt) continue;
    await db.task.update({ where: { id: task.id }, data: { dueSoonNotifiedAt: now } });
    // A task given out inside its last day was announced when it was given
    // (see createTask); a second notice straight after would only repeat it.
    if (task.createdAt.getTime() >= task.dueOn.getTime() - 86_400_000) continue;
    flagged += 1;
    const property = task.property ? propertyDisplayName(task.property) : null;
    notices.push(
      ...recipients.map((userId) => ({
        userId,
        kind: "TASK_DUE" as const,
        title: days === 0 ? `Due today: ${task.title}` : `Due tomorrow: ${task.title}`,
        body: [TASK_PRIORITY_LABELS[task.priority], property].filter(Boolean).join(", "),
        href: taskHref(task.id),
      })),
    );
  }

  await notify(db, notices);
  return flagged;
}
