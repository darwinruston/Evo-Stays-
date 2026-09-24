import { prisma } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { calendarDayKey as calendarDay, dayBounds, isDateOnly, toIsoDate } from "@/lib/schedule";
import { notify, staffUserIds, type NotificationInput } from "@/lib/notify";

// What's known about the NEXT guests after a clean -- the thing that turns
// "a clean on Friday" into "a clean on Friday that must be done by 3pm
// because people are walking in". Derived from the synced bookings already
// on file (iCal events and Hostify reservations) rather than stored on the
// Clean, so a booking that moves or cancels is reflected the next time any
// page asks, with no second copy to keep in step.
export type Turnover = {
  // When the next guests are due. Only a real time of day when
  // arrivalTimeKnown; otherwise just the day (local midnight).
  nextArrival: Date;
  arrivalTimeKnown: boolean;
  // Next guests arrive on the same calendar day as this clean -- the
  // turnover has a hard deadline, not just a date.
  sameDay: boolean;
};

// Used only to decide WHEN to raise an at-risk alert for a same-day
// turnover whose booking has no time and whose property has no configured
// check-in time -- mid-afternoon is the usual UK short-let check-in. Never
// shown to anyone as if it were the real arrival time.
const ASSUMED_CHECK_IN = { hours: 15, minutes: 0 };

// How long before the next guests are due to raise the alarm: earlier for a
// clean nobody's even started (there's still the whole turnover to do) than
// for one already under way.
const AT_RISK_LEAD_MS = {
  PENDING: 2 * 60 * 60 * 1000,
  IN_PROGRESS: 30 * 60 * 1000,
} as const;

// A booking's check-in as a usable moment: its own time if it has one,
// else the property's standard check-in time on that day, else just the day.
function resolveArrival(checkIn: Date, checkInTime: string | null): { at: Date; known: boolean } {
  if (!isDateOnly(checkIn)) return { at: checkIn, known: true };
  const [y, m, d] = calendarDay(checkIn).split("-").map(Number);
  if (checkInTime) {
    const [hh, mm] = checkInTime.split(":").map(Number);
    return { at: new Date(y, m - 1, d, hh, mm), known: true };
  }
  return { at: new Date(y, m - 1, d), known: false };
}

type CleanLike = { id: string; propertyId: string; scheduledFor: Date | null };

// The next arrival after each clean, in one pass -- two booking queries for
// the whole set rather than per clean, since list pages call this for
// dozens of rows at once. A clean with no scheduled date, or no known
// booking after it, is simply absent from the map.
export async function turnoversFor(cleans: CleanLike[]): Promise<Map<string, Turnover>> {
  const scheduled = cleans.filter((c): c is CleanLike & { scheduledFor: Date } => c.scheduledFor !== null);
  const result = new Map<string, Turnover>();
  if (scheduled.length === 0) return result;

  const propertyIds = [...new Set(scheduled.map((c) => c.propertyId))];
  // A day's slack below the earliest clean, so a date-only check-in near
  // midnight can't fall outside the query purely on timezone offset. The
  // exact same-day-or-later test happens per clean below.
  const earliest = Math.min(...scheduled.map((c) => c.scheduledFor.getTime()));
  const lowerBound = new Date(earliest - 24 * 60 * 60 * 1000);

  const [events, reservations, properties] = await Promise.all([
    prisma.syncedBookingEvent.findMany({
      where: { cancelled: false, checkIn: { gte: lowerBound }, feed: { propertyId: { in: propertyIds } } },
      select: { checkIn: true, feed: { select: { propertyId: true } } },
    }),
    // Only confirmed reservations -- the same "accepted" test hostifySync
    // uses before it will create a clean. A pending request may never turn
    // into guests, and shouldn't put a deadline on anyone.
    prisma.syncedHostifyReservation.findMany({
      where: { cancelled: false, status: "accepted", checkIn: { gte: lowerBound }, propertyId: { in: propertyIds } },
      select: { checkIn: true, propertyId: true },
    }),
    prisma.property.findMany({ where: { id: { in: propertyIds } }, select: { id: true, checkInTime: true } }),
  ]);

  const checkInsByProperty = new Map<string, Date[]>();
  const add = (propertyId: string, checkIn: Date) => {
    const list = checkInsByProperty.get(propertyId);
    if (list) list.push(checkIn);
    else checkInsByProperty.set(propertyId, [checkIn]);
  };
  for (const e of events) add(e.feed.propertyId, e.checkIn);
  for (const r of reservations) add(r.propertyId, r.checkIn);
  for (const list of checkInsByProperty.values()) list.sort((a, b) => a.getTime() - b.getTime());

  const checkInTimes = new Map(properties.map((p) => [p.id, p.checkInTime]));

  for (const clean of scheduled) {
    const cleanDay = calendarDay(clean.scheduledFor);
    // The first check-in on or after the clean's own day. The booking that
    // created this clean checked in days earlier, so it can't match itself.
    const next = checkInsByProperty.get(clean.propertyId)?.find((checkIn) => calendarDay(checkIn) >= cleanDay);
    if (!next) continue;
    const { at, known } = resolveArrival(next, checkInTimes.get(clean.propertyId) ?? null);
    result.set(clean.id, { nextArrival: at, arrivalTimeKnown: known, sameDay: calendarDay(next) === cleanDay });
  }
  return result;
}

export async function turnoverFor(clean: CleanLike): Promise<Turnover | null> {
  return (await turnoversFor([clean])).get(clean.id) ?? null;
}

// The next guests due at a property from a given moment -- the same lookup
// as a clean's turnover, just anchored on "now" instead of a clean's slot.
// Includes anyone checking in earlier today (who may already be there),
// which is what severity assessment wants: a problem found with guests on
// site or about to be is as pressing as it gets. See assessIssueSeverity in
// src/lib/issues.ts.
export async function nextArrivalFrom(propertyId: string, from: Date): Promise<Turnover | null> {
  return turnoverFor({ id: "_", propertyId, scheduledFor: from });
}

function timeOfDay(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "Fri 26 Sept, 15:00", or just "Fri 26 Sept" when the time isn't known --
// formatScheduledFor can't be reused here, since an unknown-time arrival is
// local midnight rather than the midnight-UTC form it recognises.
export function formatArrival(t: Turnover): string {
  const day = t.nextArrival.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return t.arrivalTimeKnown ? `${day}, ${timeOfDay(t.nextArrival)}` : day;
}

// The short label for a clean list row. Only the cases that change how
// urgently someone should treat the clean get a label at all -- "next
// guests in 9 days" on every row would just be noise.
export function turnoverLabel(t: Turnover, scheduledFor: Date): { text: string; urgent: boolean } | null {
  if (t.sameDay) {
    return {
      text: t.arrivalTimeKnown ? `Same-day · guests at ${timeOfDay(t.nextArrival)}` : "Same-day · guests arrive today",
      urgent: true,
    };
  }
  // nextArrival is always a local moment (resolveArrival never returns the
  // midnight-UTC date-only form), so its local day is the right one to
  // compare against the day after the clean's own calendar day.
  const [y, m, d] = calendarDay(scheduledFor).split("-").map(Number);
  if (toIsoDate(t.nextArrival) === toIsoDate(new Date(y, m - 1, d + 1))) {
    return { text: "Next guests the day after", urgent: false };
  }
  return null;
}

// Ordering key within one day's list: same-day turnovers first, soonest
// deadline first among them (unknown times after known ones), everything
// else after in its original order.
//
// Finite sentinels rather than Infinity, so a comparator subtracting two of
// these never computes Infinity - Infinity (NaN).
export function turnoverPriority(t: Turnover | null | undefined): number {
  if (!t?.sameDay) return Number.MAX_SAFE_INTEGER;
  return t.arrivalTimeKnown ? t.nextArrival.getTime() : Number.MAX_SAFE_INTEGER - 1;
}

// When the next guests are due, as a usable moment -- the real arrival time
// where known, the assumed mid-afternoon check-in otherwise. For deciding
// how soon something matters (at-risk alerts, issue severity), never for
// showing anyone as if it were the real time.
export function arrivalDeadline(t: Turnover): Date {
  if (t.arrivalTimeKnown) return t.nextArrival;
  const d = new Date(t.nextArrival);
  d.setHours(ASSUMED_CHECK_IN.hours, ASSUMED_CHECK_IN.minutes, 0, 0);
  return d;
}

// Past this long after the deadline, an alert has stopped being useful --
// the guests have either been let in or the office already knows. Without
// a cap, a clean nobody checked out of properly (or every same-day clean
// at once, after a late-evening server restart) would fire a "guests
// arriving soon" alert hours after they arrived.
const AT_RISK_STALE_MS = 2 * 60 * 60 * 1000;

type AtRiskClean = {
  id: string;
  status: string;
  assignedToId: string | null;
  property: { name: string | null; address: string };
  assignedTo: { name: string } | null;
};

// The notices for one at-risk clean, worded for whether the deadline is
// still ahead or has just passed. Exported so reassigning an
// already-alerted clean (updateClean in src/app/admin/cleans/actions.ts)
// can tell the newly assigned cleaner, who missed the original alert.
export function atRiskNotices(
  clean: AtRiskClean,
  t: Turnover,
  now: Date,
  recipients: { staffIds: string[]; cleaner: boolean },
): NotificationInput[] {
  const where = propertyDisplayName(clean.property);
  const passed = now.getTime() >= arrivalDeadline(t).getTime();
  const at = t.arrivalTimeKnown ? `at ${timeOfDay(t.nextArrival)}` : "today";
  const state = clean.status === "PENDING" ? "not started" : "still in progress";
  const who = clean.assignedTo ? ` (${clean.assignedTo.name})` : " and has no cleaner";

  const notices: NotificationInput[] = recipients.staffIds.map((userId) => ({
    userId,
    kind: "TURNOVER_AT_RISK" as const,
    title: passed ? `Guests due, clean not finished: ${where}` : `At risk: ${where}`,
    body: passed
      ? `Guests were due ${at} — the clean is ${state}${who}.`
      : `Guests arrive ${at} — the clean is ${state}${who}.`,
    href: `/admin/cleans/${clean.id}`,
  }));
  if (recipients.cleaner && clean.assignedToId) {
    notices.push({
      userId: clean.assignedToId,
      kind: "TURNOVER_AT_RISK",
      title: passed ? `Guests already due: ${where}` : `Guests arriving soon: ${where}`,
      body: passed
        ? `Next guests were due ${at} — finish as soon as you can and let the office know.`
        : `Next guests arrive ${at} — make sure it's finished before then.`,
      href: `/cleaner/cleans/${clean.id}`,
    });
  }
  return notices;
}

// Whether a same-day turnover is inside its alert window right now: close
// enough to the deadline to worry about (earlier for one nobody's started),
// but not so long after it that the alert is stale.
export function isAtRisk(status: string, t: Turnover, now: Date): boolean {
  if (!t.sameDay || (status !== "PENDING" && status !== "IN_PROGRESS")) return false;
  const deadline = arrivalDeadline(t).getTime();
  return (
    now.getTime() >= deadline - AT_RISK_LEAD_MS[status] && now.getTime() <= deadline + AT_RISK_STALE_MS
  );
}

// Run on a short timer by the in-process scheduler (src/lib/syncScheduler.ts):
// finds today's same-day turnovers that aren't finished with the next
// guests close (or just past due), and alerts staff plus the assigned
// cleaner once each (see Clean.atRiskNotifiedAt). Returns how many cleans
// it alerted on.
export async function checkAtRiskTurnovers(now = new Date()): Promise<number> {
  const { start, end } = dayBounds(now);
  const cleans = await prisma.clean.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      atRiskNotifiedAt: null,
      scheduledFor: { gte: start, lt: end },
    },
    include: {
      property: { select: { name: true, address: true } },
      assignedTo: { select: { name: true } },
    },
  });
  if (cleans.length === 0) return 0;

  const turnovers = await turnoversFor(cleans);
  const staffIds = await staffUserIds();
  const notices: NotificationInput[] = [];
  const alerted: string[] = [];

  for (const clean of cleans) {
    const t = turnovers.get(clean.id);
    if (!t || !isAtRisk(clean.status, t, now)) continue;
    notices.push(...atRiskNotices(clean, t, now, { staffIds, cleaner: true }));
    alerted.push(clean.id);
  }

  if (alerted.length > 0) {
    await prisma.clean.updateMany({ where: { id: { in: alerted } }, data: { atRiskNotifiedAt: now } });
    await notify(notices);
  }
  return alerted.length;
}

// Whether the deadline on a same-day turnover has already gone by -- for
// the cleaner's banner, which shouldn't still say "finish before then"
// once "then" is in the past.
export function deadlinePassed(t: Turnover, now = new Date()): boolean {
  return t.sameDay && t.arrivalTimeKnown && now.getTime() >= t.nextArrival.getTime();
}
