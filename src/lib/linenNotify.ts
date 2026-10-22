import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { getOrgModules } from "@/lib/modules";
import type { NotificationInput } from "@/lib/notify";
import { isDateOnly, sameCalendarDay, toIsoDate } from "@/lib/schedule";

// Telling a linen company when something it has planned around has changed:
// a clean at one of its properties was cancelled, moved to another day, or
// its cleaner's arrival time changed (which moves the window it has to
// arrive in). It sees the new times on its schedule either way: this is so
// it hears about it instead of having to look.
//
// Pure description of the change in describeLinenChange, so the rules can be
// tested without a database; linenNoticesFor turns it into notices for the
// right logins. Both are safe to call after any edit: they say nothing when
// nothing relevant changed.

export type LinenCleanSnapshot = {
  propertyId: string;
  status: string;
  scheduledFor: Date | null;
  plannedArrivalAt: Date | null;
};

export type LinenChange =
  | { kind: "cancelled"; day: Date }
  | { kind: "moved"; from: Date; to: Date }
  | { kind: "arrival"; day: Date; from: Date | null; to: Date | null };

// When the cleaner will actually be there: the time they confirmed, else the
// clean's own time (a date with no time has no arrival to plan around).
function effectiveArrival(s: LinenCleanSnapshot): Date | null {
  if (s.plannedArrivalAt) return s.plannedArrivalAt;
  return s.scheduledFor && !isDateOnly(s.scheduledFor) ? s.scheduledFor : null;
}

function minuteKey(date: Date | null): number | null {
  return date ? Math.floor(date.getTime() / 60_000) : null;
}

// `after` is null when the clean was deleted. Returns null when nothing the
// linen company cares about changed: only a clean that was still to be done
// matters, and only an upcoming one.
export function describeLinenChange(
  before: LinenCleanSnapshot,
  after: LinenCleanSnapshot | null,
  now: Date = new Date(),
): LinenChange | null {
  if (before.status !== "PENDING" || !before.scheduledFor) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (before.scheduledFor < startOfToday) return null;

  if (after === null || after.status === "CANCELLED" || !after.scheduledFor) {
    return { kind: "cancelled", day: before.scheduledFor };
  }
  if (after.status !== "PENDING") return null;

  if (!sameCalendarDay(before.scheduledFor, after.scheduledFor)) {
    return { kind: "moved", from: before.scheduledFor, to: after.scheduledFor };
  }
  const was = effectiveArrival(before);
  const now2 = effectiveArrival(after);
  if (minuteKey(was) !== minuteKey(now2)) {
    return { kind: "arrival", day: after.scheduledFor, from: was, to: now2 };
  }
  return null;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function linenNoticeFor(userId: string, propertyName: string, change: LinenChange): NotificationInput {
  const base = { userId, kind: "LINEN_SCHEDULE_CHANGED" as const };
  if (change.kind === "cancelled") {
    return {
      ...base,
      title: `Clean cancelled: ${propertyName}`,
      body: `${dayLabel(change.day)} is off, so no linen is needed there.`,
      href: `/linen?from=${toIsoDate(change.day)}`,
    };
  }
  if (change.kind === "moved") {
    return {
      ...base,
      title: `Clean moved: ${propertyName}`,
      body: `From ${dayLabel(change.from)} to ${dayLabel(change.to)}. Check the new times.`,
      href: `/linen?from=${toIsoDate(change.to)}`,
    };
  }
  const now = change.to ? `now ${clock(change.to)}` : "no time set yet";
  const was = change.from ? `was ${clock(change.from)}` : "was not set";
  return {
    ...base,
    title: `Cleaner's time changed: ${propertyName}`,
    body: `${dayLabel(change.day)}: ${now} (${was}), so your window has moved.`,
    href: `/linen?from=${toIsoDate(change.day)}`,
  };
}

// The notices to send for one clean's change: one per login of the linen
// company that supplies its property. Nothing when the company doesn't use
// laundry, the property has no linen company, or no login exists. Never
// throws: a notice is a side effect of a change that's already saved.
export async function linenNoticesFor(
  db: ScopedPrismaClient,
  before: LinenCleanSnapshot,
  after: LinenCleanSnapshot | null,
): Promise<NotificationInput[]> {
  try {
    const change = describeLinenChange(before, after);
    if (!change) return [];
    if (!(await getOrgModules(db.organizationId)).laundry) return [];

    const property = await db.property.findUnique({
      where: { id: before.propertyId },
      select: { laundryFacilityId: true, nickname: true, name: true, address: true },
    });
    if (!property?.laundryFacilityId) return [];

    const logins = await db.user.findMany({
      where: { role: "LINEN", laundryFacilityId: property.laundryFacilityId },
      select: { id: true },
    });
    const name = propertyDisplayName(property);
    return logins.map((u) => linenNoticeFor(u.id, name, change));
  } catch (err) {
    console.error("[linen notify] couldn't work out who to tell:", err);
    return [];
  }
}
