import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { geocodeUkAddress } from "@/lib/geocode";
import { planRoute, type LatLng, type RoutePlan, type StopInput } from "@/lib/linenRoute";
import { dayBounds, isDateOnly } from "@/lib/schedule";

export type LinenDay = {
  facility: { id: string; name: string; depotAddress: string | null };
  day: Date;
  plan: RoutePlan;
  // Things that make the plan less certain than it looks, in plain words.
  notes: string[];
  depotKnown: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// One day's delivery plan for a linen company: every property it supplies
// that has a clean still to do that day, ordered and timed (see planRoute).
// Properties and the depot are found on the map the first time they're
// needed, from their postcode, and remembered.
export async function loadLinenDay(
  db: ScopedPrismaClient,
  facilityId: string,
  day: Date,
): Promise<LinenDay | null> {
  const facility = await db.laundryFacility.findUnique({ where: { id: facilityId } });
  if (!facility) return null;

  const { start, end } = dayBounds(day);
  const cleans = await db.clean.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { gte: start, lt: end },
      property: { laundryFacilityId: facilityId },
    },
    orderBy: { scheduledFor: "asc" },
    include: {
      property: { select: { id: true, nickname: true, name: true, address: true, latitude: true, longitude: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const notes: string[] = [];

  // The depot: found once from its address, then stored.
  let depot: LatLng | null =
    facility.depotLatitude !== null && facility.depotLongitude !== null
      ? { lat: facility.depotLatitude, lng: facility.depotLongitude }
      : null;
  if (!depot && facility.depotAddress) {
    depot = await geocodeUkAddress(facility.depotAddress);
    if (depot) {
      await db.laundryFacility.update({
        where: { id: facility.id },
        data: { depotLatitude: depot.lat, depotLongitude: depot.lng },
      });
    }
  }
  if (!depot) {
    notes.push(
      facility.depotAddress
        ? "We couldn't find the van's starting address on the map, so the first drive is a rough guess."
        : "No starting address has been set for the van, so the first drive isn't counted.",
    );
  }

  // Each property once, even if two cleans fall on it the same day: the
  // earlier one sets the deadline.
  const seen = new Set<string>();
  const locations = new Map<string, LatLng | null>();
  for (const clean of cleans) {
    const p = clean.property;
    if (locations.has(p.id)) continue;
    let location: LatLng | null =
      p.latitude !== null && p.longitude !== null ? { lat: p.latitude, lng: p.longitude } : null;
    if (!location) {
      location = await geocodeUkAddress(p.address);
      if (location) {
        await db.property.update({ where: { id: p.id }, data: { latitude: location.lat, longitude: location.lng } });
      }
    }
    locations.set(p.id, location);
  }

  const stops: StopInput[] = [];
  for (const clean of cleans) {
    if (seen.has(clean.propertyId)) continue;
    seen.add(clean.propertyId);
    const scheduled = clean.scheduledFor;
    const arrival = clean.plannedArrivalAt ?? (scheduled && !isDateOnly(scheduled) ? scheduled : null);
    stops.push({
      cleanId: clean.id,
      propertyId: clean.propertyId,
      name: propertyDisplayName(clean.property),
      address: clean.property.address,
      location: locations.get(clean.propertyId) ?? null,
      cleanerName: clean.assignedTo?.name ?? null,
      cleanerArrival: arrival,
      arrivalConfirmed: clean.plannedArrivalAt !== null,
    });
  }

  const dayStart = new Date(start.getTime() + facility.dayStartMinutes * 60_000);
  const plan = planRoute(stops, {
    depot,
    dayStart,
    bufferMinutes: facility.dropBufferMinutes,
    stopMinutes: facility.stopMinutes,
  });

  if (plan.stops.some((s) => !s.location)) {
    notes.push("Some properties couldn't be found on the map, so a cautious drive time was used for them.");
  }
  if (plan.stops.some((s) => !s.arrivalConfirmed)) {
    notes.push("Where a cleaner hasn't confirmed their arrival, the time the clean is booked for is used.");
  }

  return {
    facility: { id: facility.id, name: facility.name, depotAddress: facility.depotAddress },
    day,
    plan,
    notes,
    depotKnown: depot !== null,
  };
}
