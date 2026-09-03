import { prisma } from "@/lib/prisma";

export type StockEstimate = {
  estimatedRemaining: number;
  guestCount: number;
  nights: number;
};

// How many nights the property was occupied before this clean: the gap
// between the previous clean at this property and this one. Not a real
// booking length -- there's no booking record in this app (see plan.md's
// open questions on iCal sync) -- but it's the only stay-length signal
// available without one, and a reasonable proxy: the property was let out
// for however long it was between turnovers. Called once per clean (not once
// per stock item) since it doesn't depend on which item is being estimated.
export async function nightsSincePreviousClean(
  propertyId: string,
  cleanId: string,
  scheduledFor: Date,
): Promise<number | null> {
  const previous = await prisma.clean.findFirst({
    where: {
      propertyId,
      id: { not: cleanId },
      scheduledFor: { lt: scheduledFor },
    },
    orderBy: { scheduledFor: "desc" },
    select: { scheduledFor: true },
  });
  if (!previous?.scheduledFor) return null;

  const ms = scheduledFor.getTime() - previous.scheduledFor.getTime();
  const nights = Math.round(ms / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
}

// A pre-filled suggestion for the "Counted" field, not a silent stock
// update -- the cleaner still confirms or corrects it against the actual
// shelf. Property size factors in only as the default guess for guestCount
// (via Property.maxOccupancy) when a clean wasn't given an explicit one;
// there's no separate size multiplier, since guests × nights already scales
// with how big a stay was.
//
// Returns null when there isn't enough to go on -- no rate configured on the
// item, no guest count on this clean or the property, or no previous clean
// to measure a stay length from (nights === null, computed once by the
// caller via nightsSincePreviousClean). Callers fall back to today's "last
// known on hand" default in that case.
export function estimateStockUsage(
  nights: number | null,
  guestCount: number | null,
  level: { onHandQty: number; stockItem: { usagePerGuestNight: number | null } },
): StockEstimate | null {
  const rate = level.stockItem.usagePerGuestNight;
  if (rate === null || rate === undefined || !guestCount || nights === null) return null;

  const used = Math.round(rate * guestCount * nights);
  return {
    estimatedRemaining: Math.max(0, level.onHandQty - used),
    guestCount,
    nights,
  };
}
