// Plans one day for a linen company's van: which property to visit in which
// order, and the latest time the linen must be at each one so it's there
// before the cleaner is. Pure functions with no database or network access,
// so the rules can be tested on their own (see the tests in this repo's
// notes) and the loader in src/lib/linenPlan.ts only has to gather inputs.
//
// Drive times are an estimate, not a map lookup: straight-line distance
// stretched by ROAD_FACTOR for the roads not being a straight line, at an
// average city speed. It's deliberately a little pessimistic, so the error
// is arriving early rather than late. driveMinutes is the one place to swap
// for a real routing service later.

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const ROAD_FACTOR = 1.3;
const AVERAGE_SPEED_KMH = 25;
// Even next door takes time to park and walk up.
const MIN_DRIVE_MINUTES = 5;
// Used when either end has no map position, so a missing location costs a
// cautious guess rather than being treated as free.
const UNKNOWN_DRIVE_MINUTES = 20;
// Beyond this many stops every order can't be tried, so the order falls back
// to soonest-deadline-first.
const MAX_EXHAUSTIVE_STOPS = 8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function straightLineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Whole minutes, rounded up. `known` is false when a position was missing
// and the cautious default was used instead.
export function driveMinutes(from: LatLng | null, to: LatLng | null): { minutes: number; known: boolean } {
  if (!from || !to) return { minutes: UNKNOWN_DRIVE_MINUTES, known: false };
  const km = straightLineKm(from, to) * ROAD_FACTOR;
  return { minutes: Math.max(MIN_DRIVE_MINUTES, Math.ceil((km / AVERAGE_SPEED_KMH) * 60)), known: true };
}

export type StopInput = {
  // One clean this stop is for: enough for the page to link back to it.
  cleanId: string;
  propertyId: string;
  name: string;
  address: string;
  location: LatLng | null;
  cleanerName: string | null;
  // When the cleaner will be there: the time they confirmed, or else the
  // clean's own time. Null when only a date is known.
  cleanerArrival: Date | null;
  arrivalConfirmed: boolean;
};

export type PlanSettings = {
  depot: LatLng | null;
  // The earliest the van sets off.
  dayStart: Date;
  // How long before the cleaner arrives the linen must already be there.
  bufferMinutes: number;
  // How long dropping off and collecting takes at each property.
  stopMinutes: number;
};

export type PlannedStop = StopInput & {
  order: number;
  // The cleaner's arrival minus the buffer: the deadline this stop works to.
  deadline: Date;
  // The latest the van can arrive and still reach every later stop on time.
  // When the day can't be made, this is the deadline that's being missed.
  deliverBy: Date;
  // When the van could first get here if it left at the start of the day
  // and went straight round in this order.
  earliestArrival: Date;
  lateByMinutes: number;
  driveFromPreviousMinutes: number;
  driveKnown: boolean;
};

export type RoutePlan = {
  stops: PlannedStop[];
  // Stops with a date but no time yet, so there's nothing to plan around.
  untimed: StopInput[];
  // The latest the van can leave the depot to make the first stop.
  leaveBy: Date | null;
  totalDriveMinutes: number;
  feasible: boolean;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

type Timed = StopInput & { cleanerArrival: Date };

type Evaluation = { lateness: number; drive: number };

// Runs the day forward in a given order with no waiting around: the earliest
// each stop could be reached, how late that is against its own deadline,
// and the total driving.
function evaluate(order: Timed[], settings: PlanSettings): Evaluation {
  let lateness = 0;
  let drive = 0;
  let clock = settings.dayStart.getTime();
  let position: LatLng | null = settings.depot;
  order.forEach((stop, index) => {
    const leg = index === 0 && !settings.depot ? { minutes: 0 } : driveMinutes(position, stop.location);
    drive += leg.minutes;
    clock += leg.minutes * 60_000;
    const deadline = stop.cleanerArrival.getTime() - settings.bufferMinutes * 60_000;
    lateness += Math.max(0, (clock - deadline) / 60_000);
    clock += settings.stopMinutes * 60_000;
    position = stop.location;
  });
  return { lateness, drive };
}

function better(a: Evaluation, b: Evaluation): boolean {
  if (a.lateness !== b.lateness) return a.lateness < b.lateness;
  return a.drive < b.drive;
}

// Every ordering of `items`, via Heap's algorithm. Only ever called for a
// handful of stops (see MAX_EXHAUSTIVE_STOPS).
function* permutations<T>(items: T[]): Generator<T[]> {
  const a = [...items];
  const c = new Array(a.length).fill(0);
  yield [...a];
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) {
      const k = i % 2 === 0 ? 0 : c[i];
      [a[k], a[i]] = [a[i], a[k]];
      yield [...a];
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }
}

function chooseOrder(timed: Timed[], settings: PlanSettings): Timed[] {
  const byDeadline = [...timed].sort((x, y) => x.cleanerArrival.getTime() - y.cleanerArrival.getTime());
  if (byDeadline.length <= 1 || byDeadline.length > MAX_EXHAUSTIVE_STOPS) return byDeadline;

  let best = byDeadline;
  let bestScore = evaluate(byDeadline, settings);
  for (const candidate of permutations(byDeadline)) {
    const score = evaluate(candidate, settings);
    if (better(score, bestScore)) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function planRoute(stops: StopInput[], settings: PlanSettings): RoutePlan {
  const timed = stops.filter((s): s is Timed => s.cleanerArrival !== null);
  const untimed = stops.filter((s) => s.cleanerArrival === null);
  if (timed.length === 0) {
    return { stops: [], untimed, leaveBy: null, totalDriveMinutes: 0, feasible: true };
  }

  const order = chooseOrder(timed, settings);
  const bufferMs = settings.bufferMinutes * 60_000;

  // Forward pass: when the van could first reach each stop, and the drive
  // before it.
  const legs = order.map((stop, index) => {
    const previous = index === 0 ? settings.depot : order[index - 1].location;
    return index === 0 && !settings.depot ? { minutes: 0, known: true } : driveMinutes(previous, stop.location);
  });
  const earliest: Date[] = [];
  let clock = settings.dayStart;
  order.forEach((_, index) => {
    clock = addMinutes(clock, legs[index].minutes);
    earliest.push(clock);
    clock = addMinutes(clock, settings.stopMinutes);
  });

  // Backward pass: the latest each stop can be reached and still leave time
  // to get to the next one before its own deadline.
  const latest: Date[] = new Array(order.length);
  for (let k = order.length - 1; k >= 0; k--) {
    const deadline = new Date(order[k].cleanerArrival.getTime() - bufferMs);
    latest[k] =
      k === order.length - 1
        ? deadline
        : new Date(
            Math.min(
              deadline.getTime(),
              addMinutes(latest[k + 1], -(settings.stopMinutes + legs[k + 1].minutes)).getTime(),
            ),
          );
  }

  const planned: PlannedStop[] = order.map((stop, k) => {
    const deadline = new Date(stop.cleanerArrival.getTime() - bufferMs);
    const lateBy = Math.max(0, Math.round((earliest[k].getTime() - deadline.getTime()) / 60_000));
    return {
      ...stop,
      order: k + 1,
      deadline,
      deliverBy: lateBy > 0 ? deadline : latest[k],
      earliestArrival: earliest[k],
      lateByMinutes: lateBy,
      driveFromPreviousMinutes: legs[k].minutes,
      driveKnown: legs[k].known,
    };
  });

  const feasible = planned.every((p) => p.lateByMinutes === 0);
  return {
    stops: planned,
    untimed,
    // An impossible day has no meaningful latest departure: the van would
    // have to leave at the start of the day and is still late.
    leaveBy: feasible ? addMinutes(latest[0], -legs[0].minutes) : settings.dayStart,
    totalDriveMinutes: legs.reduce((sum, leg) => sum + leg.minutes, 0),
    feasible,
  };
}
