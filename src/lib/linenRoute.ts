// Plans one day for a linen company's van: which property to visit in which
// order, and the window of time to be at each one. The van comes AFTER the
// cleaner has arrived, to take that turnover's dirty linen, and brings clean
// linen the cleaner still has to use. Both ends of the window scale with how
// long the clean takes, since a longer clean means a bigger property with
// more beds: it opens once the cleaner has had time to strip the bedding (a
// small share of the clean, about 15%), and closes while a larger share of
// the clean is still left to make the beds (about a third). So a one hour
// clean has a window from about 10 minutes in to 20 minutes before the end,
// and a three hour one from about 25 minutes in to an hour before the end. Pure functions with no database or
// network access, so the rules can be tested on their own and the loader in
// src/lib/linenPlan.ts only has to gather inputs.
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
  // How long the clean at this property usually takes, and whether that is
  // learned from past visits (see src/lib/cleanDuration.ts).
  cleanMinutes: number;
  cleanEstimateSample: number;
  cleanEstimateLearned: boolean;
  // A time the linen company picked to arrive. Used (and planned around) only
  // while it still falls inside the window; if the window has moved since and
  // it no longer fits, it's ignored and reported as chosenFits: false.
  chosenArrival: Date | null;
};

export type PlanSettings = {
  depot: LatLng | null;
  // The earliest the van sets off.
  dayStart: Date;
  // How long after the cleaner arrives the van may come, so they've had time
  // to strip the bedding: a percentage of the clean's length, and the least
  // that can be.
  handoverPercent: number;
  minHandoverMinutes: number;
  // How much of the clean must still be left when the clean linen arrives,
  // as a percentage of the clean's length, and the least that can be.
  leadPercent: number;
  minLeadMinutes: number;
  // How long dropping off and collecting takes at each property.
  stopMinutes: number;
};

export type PlannedStop = StopInput & {
  order: number;
  // The window the van is allowed to arrive within, from the cleaner's arrival.
  windowStart: Date;
  windowEnd: Date;
  // "set" when the linen company's own chosen time is in use, "stale" when
  // they chose one but it no longer fits the window, "none" otherwise.
  chosen: "none" | "set" | "stale";
  // True when the clean is so short that the window had to close before the
  // dirty linen would normally be ready.
  tight: boolean;
  // How long before the clean ends the clean linen has to be here by.
  leadMinutes: number;
  // How long after the cleaner arrives the window opens.
  handoverMinutes: number;
  // When the van is planned to arrive: the earliest it can, waiting outside
  // if it would otherwise be early, going round in this order.
  plannedArrival: Date;
  // The latest it can arrive and still make every later stop in its window.
  latestArrival: Date;
  // Minutes the van waits before this stop for its window to open.
  waitMinutes: number;
  // How far past the window's end the plan has to be, 0 when it fits.
  lateByMinutes: number;
  driveFromPreviousMinutes: number;
  driveKnown: boolean;
};

export type RoutePlan = {
  stops: PlannedStop[];
  // Stops with a date but no time yet, so there's nothing to plan around.
  untimed: StopInput[];
  totalDriveMinutes: number;
  feasible: boolean;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

type Timed = StopInput & { cleanerArrival: Date };

type Evaluation = { lateness: number; finish: number; drive: number };

// How long before the end of a clean its linen has to be there: a share of
// the clean's length, never less than the minimum.
export function leadMinutesFor(cleanMinutes: number, settings: PlanSettings): number {
  const share = Math.round((cleanMinutes * settings.leadPercent) / 100 / 5) * 5;
  return Math.max(settings.minLeadMinutes, share);
}

// How long after the cleaner arrives the dirty linen is ready: a small share
// of the clean's length (more beds to strip in a bigger property), never
// less than the minimum.
export function handoverMinutesFor(cleanMinutes: number, settings: PlanSettings): number {
  const share = Math.round((cleanMinutes * settings.handoverPercent) / 100 / 5) * 5;
  return Math.max(settings.minHandoverMinutes, share);
}

// The window to arrive in. It closes leadMinutesFor() before the clean is
// expected to end; it opens handoverMinutesFor() after the cleaner arrives,
// unless the clean is so short that this would be after it closes, in which
// case it opens when it closes (a single moment, flagged as tight).
function windowOf(
  stop: Timed,
  settings: PlanSettings,
): {
  // The window the van is allowed to use.
  allowedStart: number;
  allowedEnd: number;
  // What the day is planned around: the allowed window, or the single moment
  // the linen company chose within it.
  start: number;
  end: number;
  tight: boolean;
  lead: number;
  handover: number;
  chosen: "none" | "set" | "stale";
} {
  const arrival = stop.cleanerArrival.getTime();
  const lead = leadMinutesFor(stop.cleanMinutes, settings);
  const handover = handoverMinutesFor(stop.cleanMinutes, settings);
  const allowedEnd = arrival + (stop.cleanMinutes - lead) * 60_000;
  const opens = arrival + handover * 60_000;
  const allowedStart = Math.min(opens, allowedEnd);

  let chosen: "none" | "set" | "stale" = "none";
  let start = allowedStart;
  let end = allowedEnd;
  if (stop.chosenArrival) {
    const at = stop.chosenArrival.getTime();
    if (at >= allowedStart && at <= allowedEnd) {
      chosen = "set";
      start = at;
      end = at;
    } else {
      chosen = "stale";
    }
  }
  return { allowedStart, allowedEnd, start, end, tight: allowedEnd < opens, lead, handover, chosen };
}

// Runs the day forward in a given order: the van goes straight to each stop
// and waits for its window to open if it gets there early. Returns how late
// that is past the windows in total, when the van finishes, and the driving.
function evaluate(order: Timed[], settings: PlanSettings): Evaluation {
  let lateness = 0;
  let drive = 0;
  let clock = settings.dayStart.getTime();
  let position: LatLng | null = settings.depot;
  order.forEach((stop, index) => {
    const leg = index === 0 && !settings.depot ? { minutes: 0 } : driveMinutes(position, stop.location);
    drive += leg.minutes;
    const window = windowOf(stop, settings);
    const arrival = Math.max(clock + leg.minutes * 60_000, window.start);
    lateness += Math.max(0, (arrival - window.end) / 60_000);
    clock = arrival + settings.stopMinutes * 60_000;
    position = stop.location;
  });
  return { lateness, finish: clock, drive };
}

function better(a: Evaluation, b: Evaluation): boolean {
  if (a.lateness !== b.lateness) return a.lateness < b.lateness;
  if (a.finish !== b.finish) return a.finish < b.finish;
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
  // Soonest window first: a good start, and the answer when there are too
  // many stops to try every order.
  const byWindow = [...timed].sort((x, y) => x.cleanerArrival.getTime() - y.cleanerArrival.getTime());
  if (byWindow.length <= 1 || byWindow.length > MAX_EXHAUSTIVE_STOPS) return byWindow;

  let best = byWindow;
  let bestScore = evaluate(byWindow, settings);
  for (const candidate of permutations(byWindow)) {
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
    return { stops: [], untimed, totalDriveMinutes: 0, feasible: true };
  }

  const order = chooseOrder(timed, settings);

  const legs = order.map((stop, index) => {
    const previous = index === 0 ? settings.depot : order[index - 1].location;
    return index === 0 && !settings.depot ? { minutes: 0, known: true } : driveMinutes(previous, stop.location);
  });

  // Forward pass: planned arrival at each stop, waiting for a window to open.
  const planned: Date[] = [];
  const waits: number[] = [];
  let clock = settings.dayStart;
  order.forEach((stop, index) => {
    const reachable = addMinutes(clock, legs[index].minutes);
    const opens = new Date(windowOf(stop, settings).start);
    const arrival = reachable.getTime() >= opens.getTime() ? reachable : opens;
    // The first stop never involves waiting: the van just leaves the depot
    // later (see leaveAt). Waiting only happens between stops.
    waits.push(index === 0 ? 0 : Math.round((arrival.getTime() - reachable.getTime()) / 60_000));
    planned.push(arrival);
    clock = addMinutes(arrival, settings.stopMinutes);
  });

  // Backward pass: the latest each stop can be reached and still leave time
  // to get to the next one before its window closes.
  const latest: Date[] = new Array(order.length);
  for (let k = order.length - 1; k >= 0; k--) {
    const end = new Date(windowOf(order[k], settings).end);
    latest[k] =
      k === order.length - 1
        ? end
        : new Date(
            Math.min(end.getTime(), addMinutes(latest[k + 1], -(settings.stopMinutes + legs[k + 1].minutes)).getTime()),
          );
    // A stop that can't be made in time has no slack at all.
    if (latest[k].getTime() < planned[k].getTime()) latest[k] = planned[k];
  }

  const result: PlannedStop[] = order.map((stop, k) => {
    const window = windowOf(stop, settings);
    return {
      ...stop,
      order: k + 1,
      windowStart: new Date(window.allowedStart),
      windowEnd: new Date(window.allowedEnd),
      chosen: window.chosen,
      tight: window.tight,
      leadMinutes: window.lead,
      handoverMinutes: window.handover,
      plannedArrival: planned[k],
      latestArrival: latest[k],
      waitMinutes: waits[k],
      lateByMinutes: Math.max(0, Math.round((planned[k].getTime() - window.end) / 60_000)),
      driveFromPreviousMinutes: legs[k].minutes,
      driveKnown: legs[k].known,
    };
  });

  return {
    stops: result,
    untimed,
    totalDriveMinutes: legs.reduce((sum, leg) => sum + leg.minutes, 0),
    feasible: result.every((r) => r.lateByMinutes === 0),
  };
}
