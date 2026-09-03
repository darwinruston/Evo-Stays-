import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/schedule";

// Suggests a cleaner when staff leave the assignee blank. Two signals, both
// from data this app actually holds:
//
//  - Familiarity: who has completed the most cleans at this property. This
//    matters more for short-lets than it did for the sibling app's one-off
//    jobs -- someone who already knows where the linen lives and how the
//    keypad behaves is faster and makes fewer mistakes. It's also why the
//    weighting is heavy (x10): a familiar cleaner is worth a busier day.
//  - Load: among equally familiar cleaners, prefer whoever has fewest cleans
//    already booked that day.
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
  }

  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const cleaner of cleaners) {
    const score = (familiarityById.get(cleaner.id) ?? 0) * 10 - (loadById.get(cleaner.id) ?? 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = cleaner.id;
    }
  }
  return bestId;
}
