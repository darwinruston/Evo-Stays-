import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/schedule";

// A designated cleaner (see PropertyCleaner in schema.prisma) already
// booked this many cleans or more on the same day drops out of first
// consideration -- "the" cleaner for a property is a strong preference, not
// a hard rule, so one person can't end up carrying every visit there just
// because they're the one designated. Tune freely; nothing else depends on
// this number.
const DESIGNATED_OVERLOAD_THRESHOLD = 2;

// Same familiarity/load scoring for whichever candidate pool is passed in --
// shared by the designated-pool tier and the full-pool fallback below.
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

// Suggests a cleaner when staff leave the assignee blank. Tries a
// property's designated cleaners first (if any are set and not already
// overloaded that day), then falls back to scoring every cleaner on two
// signals, both from data this app actually holds:
//
//  - Familiarity: who has completed the most cleans at this property. This
//    matters more for short-lets than it did for the sibling app's one-off
//    jobs -- someone who already knows where the linen lives and how the
//    keypad behaves is faster and makes fewer mistakes. It's also why the
//    weighting is heavy (x10): a familiar cleaner is worth a busier day.
//  - Load: among equally familiar cleaners, prefer whoever has fewest cleans
//    already booked that day.
//
// Designation isn't folded into that same score -- familiarity accumulates
// without bound (every completed clean adds 10) while load never realistically
// gets past single digits, so no flat bonus could both reliably beat an
// experienced non-designated cleaner AND still yield to load the way "a
// strong preference, not a hard rule" is supposed to. Trying the designated
// pool as its own first tier sidesteps that instead of trying to arithmetic
// its way around it.
//
// The sibling app also scored on geographic proximity, using lat/lng from
// visit history. That's deliberately not ported: nothing in this app sets
// Property.latitude/longitude yet (there's no address autocomplete), so the
// signal would be dead weight scoring zero for everyone. Worth adding back
// with the autocomplete, not before.
//
// Returns null only when there are no cleaners at all, leaving the clean
// unassigned for an admin to sort out.
export async function autoAssignCleaner(
  propertyId: string,
  scheduledFor: Date | null,
): Promise<string | null> {
  const cleaners = await prisma.user.findMany({
    where: { role: "CLEANER" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (cleaners.length === 0) return null;

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
  const designatedPick = pickBest(availableDesignated, familiarityById, loadById);
  if (designatedPick !== null) return designatedPick;

  return pickBest(
    cleaners.map((c) => c.id).filter((id) => !unavailableIds.has(id)),
    familiarityById,
    loadById,
  );
}
