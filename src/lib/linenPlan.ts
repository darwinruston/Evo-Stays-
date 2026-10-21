import type { ScopedPrismaClient } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { geocodeUkAddress } from "@/lib/geocode";
import { planRoute, type LatLng, type RoutePlan, type StopInput } from "@/lib/linenRoute";
import { dayBounds, isDateOnly } from "@/lib/schedule";
import { estimateCleanMinutes, visitMinutes } from "@/lib/cleanDuration";

// What the linen company has said about one stop (see LinenVisit): the
// problem it flagged, and what the office said back.
export type VisitInfo = {
  issueNote: string | null;
  issueRaisedAt: Date | null;
  issueResolvedAt: Date | null;
  resolutionNote: string | null;
};

export type LinenDay = {
  facility: { id: string; name: string; depotAddress: string | null };
  day: Date;
  plan: RoutePlan;
  // Keyed by the stop's cleanId. Only stops the linen company has done
  // something about have an entry.
  visits: Record<string, VisitInfo>;
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

  // How long each property's clean usually takes, from the visits already
  // recorded there (newest first; see estimateCleanMinutes).
  const propertyIds = [...locations.keys()];
  const history = propertyIds.length
    ? await db.cleanLog.findMany({
        where: {
          arrivedAt: { not: null },
          departedAt: { not: null },
          clean: { propertyId: { in: propertyIds } },
        },
        orderBy: { departedAt: "desc" },
        select: { arrivedAt: true, departedAt: true, clean: { select: { propertyId: true } } },
        take: 400,
      })
    : [];
  const visitsByProperty = new Map<string, number[]>();
  for (const log of history) {
    if (!log.arrivedAt || !log.departedAt) continue;
    const minutes = visitMinutes(log.arrivedAt, log.departedAt);
    if (minutes === null) continue;
    const list = visitsByProperty.get(log.clean.propertyId) ?? [];
    list.push(minutes);
    visitsByProperty.set(log.clean.propertyId, list);
  }

  const visitRows = cleans.length
    ? await db.linenVisit.findMany({ where: { cleanId: { in: cleans.map((c) => c.id) } } })
    : [];
  const visitByClean = new Map(visitRows.map((v) => [v.cleanId, v]));

  const stops: StopInput[] = [];
  for (const clean of cleans) {
    if (seen.has(clean.propertyId)) continue;
    seen.add(clean.propertyId);
    const scheduled = clean.scheduledFor;
    const arrival = clean.plannedArrivalAt ?? (scheduled && !isDateOnly(scheduled) ? scheduled : null);
    const estimate = estimateCleanMinutes(
      visitsByProperty.get(clean.propertyId) ?? [],
      facility.defaultCleanMinutes,
    );
    stops.push({
      cleanId: clean.id,
      propertyId: clean.propertyId,
      name: propertyDisplayName(clean.property),
      address: clean.property.address,
      location: locations.get(clean.propertyId) ?? null,
      cleanerName: clean.assignedTo?.name ?? null,
      cleanerArrival: arrival,
      arrivalConfirmed: clean.plannedArrivalAt !== null,
      cleanMinutes: estimate.minutes,
      cleanEstimateSample: estimate.sample,
      cleanEstimateLearned: estimate.learned,
      chosenArrival: visitByClean.get(clean.id)?.chosenArrivalAt ?? null,
    });
  }

  const dayStart = new Date(start.getTime() + facility.dayStartMinutes * 60_000);
  const plan = planRoute(stops, {
    depot,
    dayStart,
    handoverPercent: facility.handoverPercent,
    minHandoverMinutes: facility.minHandoverMinutes,
    leadPercent: facility.cleanLeadPercent,
    minLeadMinutes: facility.minLeadMinutes,
    stopMinutes: facility.stopMinutes,
  });

  if (plan.stops.some((s) => !s.location)) {
    notes.push("Some properties couldn't be found on the map, so a cautious drive time was used for them.");
  }
  if (plan.stops.some((s) => !s.arrivalConfirmed)) {
    notes.push("Where a cleaner hasn't confirmed their arrival, the time the clean is booked for is used.");
  }

  const visits: Record<string, VisitInfo> = {};
  for (const stop of plan.stops) {
    const v = visitByClean.get(stop.cleanId);
    if (v && (v.issueNote || v.issueRaisedAt)) {
      visits[stop.cleanId] = {
        issueNote: v.issueNote,
        issueRaisedAt: v.issueRaisedAt,
        issueResolvedAt: v.issueResolvedAt,
        resolutionNote: v.resolutionNote,
      };
    }
  }

  return {
    facility: { id: facility.id, name: facility.name, depotAddress: facility.depotAddress },
    day,
    plan,
    visits,
    notes,
    depotKnown: depot !== null,
  };
}

// The number of days one page of the schedule covers.
export const LINEN_RANGE_DAYS = 7;

// Several days in a row, starting at `from`, each planned on its own (a van's
// day starts afresh each morning). Loaded one after another so the map
// lookup for a new property is made once and remembered.
export async function loadLinenDays(
  db: ScopedPrismaClient,
  facilityId: string,
  from: Date,
  count: number = LINEN_RANGE_DAYS,
): Promise<LinenDay[]> {
  const days: LinenDay[] = [];
  for (let i = 0; i < count; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const data = await loadLinenDay(db, facilityId, day);
    if (data) days.push(data);
  }
  return days;
}
