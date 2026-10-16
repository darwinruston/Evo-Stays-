import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { notify, staffUserIds, type NotificationInput } from "@/lib/notify";
import { formatScheduledFor, isDateOnly } from "@/lib/schedule";

// How far ahead of a clean staff are told its arrival time is still
// unconfirmed. A day gives the cleaner the evening before to confirm and
// staff time to chase or reassign if they don't.
export const ARRIVAL_CONFIRM_WINDOW_HOURS = 24;
// A clean edited or reassigned this recently isn't flagged yet: whoever it
// was just handed to hasn't had a fair chance to confirm.
const ARRIVAL_GRACE_MINUTES = 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatTimeOfDay(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The "HH:MM" a confirm form should start on: the confirmed time if there is
// one, else the clean's own time, unless that's a date-only slot (see
// isDateOnly), whose midnight isn't a real time to suggest.
export function defaultArrivalTime(clean: { scheduledFor: Date | null; plannedArrivalAt: Date | null }): string {
  if (clean.plannedArrivalAt) return formatTimeOfDay(clean.plannedArrivalAt);
  if (clean.scheduledFor && !isDateOnly(clean.scheduledFor)) return formatTimeOfDay(clean.scheduledFor);
  return "";
}

// "HH:MM" on the calendar day the clean is scheduled for, or null for
// anything that isn't a real time. A date-only slot is read by its UTC date
// (that IS the day the booking said) and everything else by its local one,
// the same rule as calendarDayKey.
export function plannedArrivalFor(scheduledFor: Date, time: string): Date | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const [y, m, d] = isDateOnly(scheduledFor)
    ? [scheduledFor.getUTCFullYear(), scheduledFor.getUTCMonth(), scheduledFor.getUTCDate()]
    : [scheduledFor.getFullYear(), scheduledFor.getMonth(), scheduledFor.getDate()];
  return new Date(y, m, d, Number(match[1]), Number(match[2]));
}

// The short line shown on a clean row: only for a clean that's still to be
// done and has someone to confirm it.
export function arrivalLabel(clean: {
  status: string;
  assignedToId: string | null;
  scheduledFor: Date | null;
  plannedArrivalAt: Date | null;
}, now = new Date()): string | null {
  if (clean.status !== "PENDING" || !clean.assignedToId || !clean.scheduledFor) return null;
  // A date that's already gone has nothing left to confirm.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (clean.scheduledFor < startOfToday) return null;
  return clean.plannedArrivalAt
    ? `Arriving ${formatTimeOfDay(clean.plannedArrivalAt)}`
    : "Arrival not confirmed";
}

// What to clear on a clean whenever it's moved or handed to someone else: a
// new slot or a new person needs a fresh confirmation.
export const RESET_ARRIVAL = { plannedArrivalAt: null, arrivalReminderNotifiedAt: null } as const;

type UnconfirmedClean = {
  id: string;
  scheduledFor: Date | null;
  property: { nickname: string | null; name: string | null; address: string };
  assignedTo: { name: string } | null;
};

export function unconfirmedArrivalNotices(staffIds: string[], clean: UnconfirmedClean): NotificationInput[] {
  const who = clean.assignedTo?.name ?? "The cleaner";
  const when = clean.scheduledFor ? formatScheduledFor(clean.scheduledFor) : "soon";
  return staffIds.map((userId) => ({
    userId,
    kind: "ARRIVAL_UNCONFIRMED" as const,
    title: `Arrival not confirmed: ${propertyDisplayName(clean.property)}`,
    body: `${who} hasn't confirmed what time they'll arrive for ${when}.`,
    href: `/admin/cleans/${clean.id}`,
  }));
}

// Run on the same short timer as checkAtRiskTurnovers (src/lib/syncScheduler.ts):
// tells staff, once per clean, about assigned cleans coming up within
// ARRIVAL_CONFIRM_WINDOW_HOURS whose cleaner still hasn't confirmed an
// arrival time. Returns how many cleans it flagged.
export async function checkUnconfirmedArrivals(db: ScopedPrismaClient, now = new Date()): Promise<number> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd = new Date(now.getTime() + ARRIVAL_CONFIRM_WINDOW_HOURS * 3_600_000);
  const settled = new Date(now.getTime() - ARRIVAL_GRACE_MINUTES * 60_000);

  const cleans = await db.clean.findMany({
    where: {
      status: "PENDING",
      assignedToId: { not: null },
      plannedArrivalAt: null,
      arrivalReminderNotifiedAt: null,
      scheduledFor: { gte: startOfToday, lt: windowEnd },
      updatedAt: { lt: settled },
    },
    include: {
      property: { select: { nickname: true, name: true, address: true } },
      assignedTo: { select: { name: true } },
    },
  });
  if (cleans.length === 0) return 0;

  const staffIds = await staffUserIds(db);
  await db.clean.updateMany({
    where: { id: { in: cleans.map((c) => c.id) } },
    data: { arrivalReminderNotifiedAt: now },
  });
  await notify(
    db,
    cleans.flatMap((c) => unconfirmedArrivalNotices(staffIds, c)),
  );
  return cleans.length;
}
