import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { logAudit } from "@/lib/audit";
import { notify, staffUserIds, type NotificationInput } from "@/lib/notify";
import { daysBetween, formatDateOnly, todayDateOnly } from "@/lib/dateOnly";
import { REMINDER_STAGES, reminderStageFor, templatesFor, type Management } from "@/lib/safetyChecks";
import { safetyTaskFields } from "@/lib/safetyTasks";

// The widest lead of any stage, so one query covers them all and the stage
// is worked out afterwards.
const WIDEST_LEAD_DAYS = Math.max(...REMINDER_STAGES.map((s) => s.days));

type DueCheck = {
  id: string;
  templateKey: string | null;
  title: string;
  intervalMonths: number;
  dueOn: Date;
  reminderStage: number;
  overdueNotifiedAt: Date | null;
  taskCreatedAt: Date | null;
  property: { id: string; nickname: string | null; name: string | null; address: string; management: Management };
};

type Flag = { check: DueCheck; kind: "stage"; stage: 1 | 2 | 3; days: number } | { check: DueCheck; kind: "overdue"; days: number };

function noticesFor(staffIds: string[], flag: Flag): NotificationInput[] {
  const { check } = flag;
  const property = propertyDisplayName(check.property);
  const when = flag.kind === "overdue" ? null : REMINDER_STAGES.find((s) => s.stage === flag.stage)!.label;
  return staffIds.map((userId) => ({
    userId,
    kind: "SAFETY_CHECK_DUE" as const,
    title:
      flag.kind === "overdue"
        ? `${check.title} overdue: ${property}`
        : `${check.title} due within ${when}: ${property}`,
    body:
      flag.kind === "overdue"
        ? `It was due on ${formatDateOnly(check.dueOn)}. It is on the team's task list; record the new date once it has been done.`
        : `It is due on ${formatDateOnly(check.dueOn)}. It is on the team's task list, ready to pick up.`,
    href: `/admin/properties/${check.property.id}?tab=safety`,
  }));
}

// Run on the same timer as the other background checks (see
// src/lib/syncScheduler.ts). For each check with a date recorded it:
//
//  - tells staff three months, one month and one week before it is due, and
//    once more if it passes its date (each only once);
//  - puts a task on the team's list at the first of those, for anyone to pick
//    up, and raises its importance for the last week and when overdue.
//
// Saving a new completion date clears all of it (see saveSafetyCheck), so the
// next cycle starts again and the old task closes. A check that is first seen
// late gets only the latest reminder that applies, not a string of missed ones.
// Returns how many checks it flagged.
export async function checkSafetyReminders(db: ScopedPrismaClient, now = new Date()): Promise<number> {
  const today = todayDateOnly(now);
  const horizon = new Date(today.getTime() + WIDEST_LEAD_DAYS * 86_400_000);

  const candidates = (await db.propertySafetyCheck.findMany({
    where: {
      notApplicable: false,
      dueOn: { not: null, lte: horizon },
      OR: [{ reminderStage: { lt: 3 } }, { overdueNotifiedAt: null }, { taskCreatedAt: null }],
    },
    select: {
      id: true,
      templateKey: true,
      title: true,
      intervalMonths: true,
      dueOn: true,
      reminderStage: true,
      overdueNotifiedAt: true,
      taskCreatedAt: true,
      property: { select: { id: true, nickname: true, name: true, address: true, management: true } },
    },
  })) as DueCheck[];

  const flags: Flag[] = [];
  const needTask: { check: DueCheck; days: number }[] = [];
  for (const check of candidates) {
    // A standard check this kind of property doesn't get (it was changed from
    // a short let to a long let) is hidden on the page, so it stays quiet too.
    if (check.templateKey && !templatesFor(check.property.management).some((t) => t.key === check.templateKey)) {
      continue;
    }
    const days = daysBetween(today, check.dueOn);
    if (days < 0) {
      if (!check.overdueNotifiedAt) flags.push({ check, kind: "overdue", days });
    } else {
      const stage = reminderStageFor(days, check.intervalMonths);
      if (stage > check.reminderStage) flags.push({ check, kind: "stage", stage: stage as 1 | 2 | 3, days });
    }
    // Within reach of the first reminder (or past due) and no task made yet
    // this cycle.
    if (!check.taskCreatedAt && (days < 0 || reminderStageFor(days, check.intervalMonths) > 0)) {
      needTask.push({ check, days });
    }
  }
  if (flags.length === 0 && needTask.length === 0) return 0;

  const staffIds = await staffUserIds(db);

  // Marked before sending, as checkUnconfirmedArrivals does, so a slow send
  // can't let the next pass tell everyone twice. An overdue check counts as
  // having had every earlier reminder.
  for (const flag of flags) {
    await db.propertySafetyCheck.update({
      where: { id: flag.check.id },
      data:
        flag.kind === "overdue"
          ? { overdueNotifiedAt: now, dueSoonNotifiedAt: now, reminderStage: 3 }
          : { dueSoonNotifiedAt: now, reminderStage: flag.stage },
    });
  }

  // The team's task for each check that needs one: made once per cycle (marked
  // first, as above), and an existing one is made more important when the
  // last week starts or the date passes.
  for (const { check, days } of needTask) {
    await db.propertySafetyCheck.update({ where: { id: check.id }, data: { taskCreatedAt: now } });
    const fields = safetyTaskFields({
      checkTitle: check.title,
      propertyName: propertyDisplayName(check.property),
      overdue: days < 0,
      daysLeft: days,
    });
    const created = await db.task.create({
      data: {
        organizationId: db.organizationId,
        ...fields,
        dueOn: check.dueOn,
        propertyId: check.property.id,
        safetyCheckId: check.id,
        assignees: { create: staffIds.map((userId) => ({ organizationId: db.organizationId, userId })) },
      },
      select: { id: true },
    });
    await logAudit(db, {
      actorId: null,
      entityType: "Task",
      entityId: created.id,
      summary: `Created task "${fields.title}" automatically from a health and safety date, for the whole team`,
    });
  }
  for (const flag of flags) {
    const urgent = flag.kind === "overdue" || flag.stage === 3;
    if (!urgent || needTask.some((n) => n.check.id === flag.check.id)) continue;
    const fields = safetyTaskFields({
      checkTitle: flag.check.title,
      propertyName: propertyDisplayName(flag.check.property),
      overdue: flag.kind === "overdue",
      daysLeft: flag.days,
    });
    await db.task.updateMany({
      where: { safetyCheckId: flag.check.id, status: { not: "DONE" } },
      data: { title: fields.title, priority: fields.priority },
    });
  }

  await notify(
    db,
    flags.flatMap((flag) => noticesFor(staffIds, flag)),
  );
  return new Set([...flags.map((f) => f.check.id), ...needTask.map((n) => n.check.id)]).size;
}
