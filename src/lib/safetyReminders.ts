import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { notify, staffUserIds, type NotificationInput } from "@/lib/notify";
import {
  daysBetween,
  formatDateOnly,
  reminderLeadDays,
  templatesFor,
  todayDateOnly,
  type Management,
} from "@/lib/safetyChecks";

// The longest lead any check has (see reminderLeadDays), so one query covers
// them all and the per-check lead is applied afterwards.
const WIDEST_LEAD_DAYS = 90;

type DueCheck = {
  id: string;
  templateKey: string | null;
  title: string;
  intervalMonths: number;
  dueOn: Date;
  dueSoonNotifiedAt: Date | null;
  overdueNotifiedAt: Date | null;
  property: { id: string; nickname: string | null; name: string | null; address: string; management: Management };
};

function noticesFor(staffIds: string[], check: DueCheck, overdue: boolean): NotificationInput[] {
  const property = propertyDisplayName(check.property);
  return staffIds.map((userId) => ({
    userId,
    kind: "SAFETY_CHECK_DUE" as const,
    title: overdue ? `${check.title} overdue: ${property}` : `${check.title} due soon: ${property}`,
    body: overdue
      ? `It was due on ${formatDateOnly(check.dueOn)}. Record the new date once it has been done.`
      : `It is due on ${formatDateOnly(check.dueOn)}. Record the new date once it has been done.`,
    href: `/admin/properties/${check.property.id}?tab=safety`,
  }));
}

// Run on the same timer as the other background checks (see
// src/lib/syncScheduler.ts): tells staff once when a check is coming up and
// once more if it passes its date. Saving a new completion date clears both,
// so the next cycle reminds again. Returns how many checks it flagged.
export async function checkSafetyReminders(db: ScopedPrismaClient, now = new Date()): Promise<number> {
  const today = todayDateOnly(now);
  const horizon = new Date(today.getTime() + WIDEST_LEAD_DAYS * 86_400_000);

  const candidates = (await db.propertySafetyCheck.findMany({
    where: {
      notApplicable: false,
      dueOn: { not: null, lte: horizon },
      OR: [{ overdueNotifiedAt: null }, { dueSoonNotifiedAt: null }],
    },
    select: {
      id: true,
      templateKey: true,
      title: true,
      intervalMonths: true,
      dueOn: true,
      dueSoonNotifiedAt: true,
      overdueNotifiedAt: true,
      property: { select: { id: true, nickname: true, name: true, address: true, management: true } },
    },
  })) as DueCheck[];

  const overdue: DueCheck[] = [];
  const dueSoon: DueCheck[] = [];
  for (const check of candidates) {
    // A standard check this kind of property doesn't get (it was changed from
    // a short let to a long let) is hidden on the page, so it stays quiet too.
    if (check.templateKey && !templatesFor(check.property.management).some((t) => t.key === check.templateKey)) {
      continue;
    }
    const days = daysBetween(today, check.dueOn);
    if (days < 0) {
      if (!check.overdueNotifiedAt) overdue.push(check);
    } else if (days <= reminderLeadDays(check.intervalMonths) && !check.dueSoonNotifiedAt) {
      dueSoon.push(check);
    }
  }
  if (overdue.length === 0 && dueSoon.length === 0) return 0;

  const staffIds = await staffUserIds(db);
  // Marked before sending, as checkUnconfirmedArrivals does, so a slow send
  // can't let the next pass tell everyone twice. An overdue check that never
  // had its "due soon" notice (recorded long ago) counts as told for both.
  if (overdue.length > 0) {
    await db.propertySafetyCheck.updateMany({
      where: { id: { in: overdue.map((c) => c.id) } },
      data: { overdueNotifiedAt: now, dueSoonNotifiedAt: now },
    });
  }
  if (dueSoon.length > 0) {
    await db.propertySafetyCheck.updateMany({
      where: { id: { in: dueSoon.map((c) => c.id) } },
      data: { dueSoonNotifiedAt: now },
    });
  }
  await notify(db, [
    ...overdue.flatMap((c) => noticesFor(staffIds, c, true)),
    ...dueSoon.flatMap((c) => noticesFor(staffIds, c, false)),
  ]);
  return overdue.length + dueSoon.length;
}
