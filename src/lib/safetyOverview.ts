import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { todayDateOnly } from "@/lib/dateOnly";
import { buildSafetyEntries, safetyState, templatesFor, type Management } from "@/lib/safetyChecks";

// Every property's health and safety checks that need attention, in one list:
// overdue, or inside the window where they are flagged (the same rule the
// property page and the reminders use, see safetyState). Used by the Health &
// safety tab in Operations and for the count on that tab.

// The longest any check is flagged ahead (see REMINDER_STAGES), so one query
// covers everything and safetyState decides which ones count.
const WIDEST_LEAD_DAYS = 90;

export type SafetyAttentionRow = {
  checkId: string;
  propertyId: string;
  propertyName: string;
  title: string;
  state: "overdue" | "due-soon";
  days: number;
  dueOn: Date;
  lastCompletedOn: Date | null;
  intervalMonths: number;
};

export async function loadSafetyAttention(db: ScopedPrismaClient, now = new Date()): Promise<SafetyAttentionRow[]> {
  const horizon = new Date(todayDateOnly(now).getTime() + WIDEST_LEAD_DAYS * 86_400_000);
  const checks = await db.propertySafetyCheck.findMany({
    where: { notApplicable: false, dueOn: { not: null, lte: horizon } },
    select: {
      id: true,
      templateKey: true,
      title: true,
      intervalMonths: true,
      lastCompletedOn: true,
      dueOn: true,
      notApplicable: true,
      property: { select: { id: true, nickname: true, name: true, address: true, management: true } },
    },
  });

  const rows: SafetyAttentionRow[] = [];
  for (const check of checks) {
    // A standard check this kind of property doesn't get is hidden on the
    // property page, so it stays out of here too.
    if (check.templateKey && !templatesFor(check.property.management as Management).some((t) => t.key === check.templateKey)) {
      continue;
    }
    const { state, days } = safetyState(check, now);
    if ((state !== "overdue" && state !== "due-soon") || days === null || !check.dueOn) continue;
    rows.push({
      checkId: check.id,
      propertyId: check.property.id,
      propertyName: propertyDisplayName(check.property),
      title: check.title,
      state,
      days,
      dueOn: check.dueOn,
      lastCompletedOn: check.lastCompletedOn,
      intervalMonths: check.intervalMonths,
    });
  }
  // The most urgent first: furthest overdue, then soonest due.
  return rows.sort((a, b) => a.days - b.days || a.propertyName.localeCompare(b.propertyName));
}

export type SafetyNotRecordedRow = { propertyId: string; propertyName: string; title: string };

// The rest of the picture, for the quiet end of the page: checks no date has
// been recorded for yet (never an alarm: a property nobody has set up is not a
// problem to chase) and how many are up to date.
export async function loadSafetyRest(
  db: ScopedPrismaClient,
  now = new Date(),
): Promise<{ notRecorded: SafetyNotRecordedRow[]; upToDate: number }> {
  const properties = await db.property.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      name: true,
      address: true,
      management: true,
      safetyChecks: {
        select: {
          id: true,
          templateKey: true,
          title: true,
          intervalMonths: true,
          lastCompletedOn: true,
          dueOn: true,
          note: true,
          notApplicable: true,
        },
      },
    },
  });

  const notRecorded: SafetyNotRecordedRow[] = [];
  let upToDate = 0;
  for (const property of properties) {
    for (const entry of buildSafetyEntries(property.safetyChecks, property.management as Management)) {
      const { state } = safetyState(entry, now);
      if (state === "not-recorded") {
        notRecorded.push({ propertyId: property.id, propertyName: propertyDisplayName(property), title: entry.title });
      } else if (state === "ok") {
        upToDate += 1;
      }
    }
  }
  return { notRecorded, upToDate };
}
