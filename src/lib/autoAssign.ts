import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/schedule";

// A designated cleaner (see PropertyCleaner in schema.prisma) already
// booked this many cleans or more on the same day drops out of first
// consideration -- "the" cleaner for a property is a strong preference, not
// a hard rule, so one person can't end up carrying every visit there just
// because they're the one designated. Tune freely; nothing else depends on
// this number.
const DESIGNATED_OVERLOAD_THRESHOLD = 2;

// Picks the best-scoring candidate from a property's designated cleaners --
// familiarity (who's completed the most cleans here) first, same-day load as
// the tiebreaker. Returns null on an empty list, which is what makes an
// undesignated property (or one where every designated cleaner is
// unavailable/overloaded) correctly come back Unassigned rather than
// guessing.
function pickBest(
  candidateIds: string[],
  familiarityById: Map<string, number>,
  loadById: Map<string, number>,
): string | null {
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const id of candidateIds) {
    const score = (familiarityById.get(id) ?? 0) * 10 - (loadById.get(id) ?? 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}

// Suggests a cleaner when staff leave the assignee blank -- but only ever
// from a property's own designated cleaners (if any are set, available that
// day, and not already overloaded -- see DESIGNATED_OVERLOAD_THRESHOLD).
// There is deliberately no fallback that guesses across the whole cleaner
// pool: a property with no designation (or where every designated cleaner
// is unavailable/overloaded) comes back null, leaving the clean Unassigned
// for an admin to direct to the right person by hand. Reassigning existing
// work is likewise always a manual admin action (see reassignUpcomingCleans
// in src/app/admin/cleaners/actions.ts) -- nothing in this app moves a
// clean between cleaners on its own.
//
// This used to also fall back to scoring every cleaner by familiarity
// (who's completed the most cleans here) and same-day load when no
// designated pick was available -- removed because, with no real signal to
// go on for an undesignated property, that fallback just landed on
// whichever cleaner account happened to be created first on every tie,
// which reads as a real assignment decision when it isn't one.
export async function autoAssignCleaner(
  propertyId: string,
  scheduledFor: Date | null,
): Promise<string | null> {
  const familiarity = await prisma.clean.groupBy({
    by: ["assignedToId"],
    where: { propertyId, status: "COMPLETED", assignedToId: { not: null } },
    _count: { _all: true },
  });
  const familiarityById = new Map(
    familiarity.map((f) => [f.assignedToId as string, f._count._all]),
  );

  const loadById = new Map<string, number>();
  // A cleaner who's blocked this day (see CleanerUnavailability in
  // schema.prisma) is left out of auto-assign entirely -- staff can still
  // assign them by hand (CleanForm warns when they do), this only changes
  // what auto-assign guesses.
  let unavailableIds = new Set<string>();
  if (scheduledFor) {
    const { start, end } = dayBounds(scheduledFor);
    const load = await prisma.clean.groupBy({
      by: ["assignedToId"],
      where: {
        scheduledFor: { gte: start, lt: end },
        assignedToId: { not: null },
        status: { not: "CANCELLED" },
      },
      _count: { _all: true },
    });
    for (const l of load) loadById.set(l.assignedToId as string, l._count._all);

    const unavailable = await prisma.cleanerUnavailability.findMany({
      where: { date: { gte: start, lt: end } },
      select: { cleanerId: true },
    });
    unavailableIds = new Set(unavailable.map((u) => u.cleanerId));
  }

  const designated = await prisma.propertyCleaner.findMany({
    where: { propertyId },
    select: { cleanerId: true },
  });
  const availableDesignated = designated
    .map((d) => d.cleanerId)
    .filter((id) => !unavailableIds.has(id) && (loadById.get(id) ?? 0) < DESIGNATED_OVERLOAD_THRESHOLD);

  return pickBest(availableDesignated, familiarityById, loadById);
}
