function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// YYYY-MM-DD in local time -- used as both the calendar grid's per-day key
// and the ?day= query param, so it must never drift with timezone/UTC
// conversion the way toISOString() would. Internal/machine use only --
// for anything a person reads, use formatDate below instead.
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// dd/mm/yyyy, for every date shown as text to a person. Kept separate from
// toIsoDate, which stays YYYY-MM-DD on purpose for sortable keys and
// <input type="date"> values (that HTML attribute requires ISO format
// regardless of display locale).
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Local-time value an <input type="datetime-local"> expects for its
// defaultValue -- toISOString() would silently shift the displayed time by
// the server's UTC offset.
export function toDateTimeLocalValue(date: Date): string {
  return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatScheduledFor(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The span of one local day, for "what's on this date" queries.
export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function formatDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// A small, fixed set of time buckets for a clean list -- deliberately coarse
// (no per-day breakdown beyond today/tomorrow) so the list reads at a glance
// instead of as a wall of individual dates.
export type CleanTimeGroup =
  | "Overdue"
  | "Today"
  | "Tomorrow"
  | "This week"
  | "Later"
  | "Unscheduled"
  | "Past";

const CLEAN_TIME_GROUP_ORDER: CleanTimeGroup[] = [
  "Overdue",
  "Today",
  "Tomorrow",
  "This week",
  "Later",
  "Unscheduled",
  "Past",
];

// Buckets one clean by comparing its scheduled date to today. A past-dated
// clean that's still not done reads as "Overdue" (the most urgent thing to
// surface); a past-dated clean that's finished reads as "Past" instead, so
// history doesn't masquerade as outstanding work. `now` is injectable for
// tests; defaults to the real clock.
export function cleanTimeGroup(
  scheduledFor: Date | null,
  isFinished: boolean,
  now: Date = new Date(),
): CleanTimeGroup {
  if (!scheduledFor) return "Unscheduled";

  const todayIso = toIsoDate(now);
  const cleanIso = toIsoDate(scheduledFor);
  if (cleanIso < todayIso) return isFinished ? "Past" : "Overdue";
  if (cleanIso === todayIso) return "Today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (cleanIso === toIsoDate(tomorrow)) return "Tomorrow";

  const weekCutoff = new Date(now);
  weekCutoff.setDate(weekCutoff.getDate() + 6);
  if (cleanIso <= toIsoDate(weekCutoff)) return "This week";

  return "Later";
}

// Groups + orders cleans under those headings, dropping empty groups. Takes
// accessors rather than assuming a shape, since the admin, cleaner and
// client lists select different fields. Callers are expected to have sorted
// soonest-first already, which this preserves within each bucket.
export function groupCleansByTime<T>(
  cleans: T[],
  getScheduledFor: (clean: T) => Date | null,
  getIsFinished: (clean: T) => boolean,
  now: Date = new Date(),
): { group: CleanTimeGroup; cleans: T[] }[] {
  const buckets = new Map<CleanTimeGroup, T[]>();
  for (const clean of cleans) {
    const group = cleanTimeGroup(getScheduledFor(clean), getIsFinished(clean), now);
    const list = buckets.get(group);
    if (list) list.push(clean);
    else buckets.set(group, [clean]);
  }
  return CLEAN_TIME_GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({
    group,
    cleans: buckets.get(group)!,
  }));
}

export type CalendarDay = { date: Date; iso: string; inCurrentMonth: boolean };

// A fixed 6-week (42-day) Monday-first grid covering the given month plus
// whatever leading/trailing days from neighbouring months fill it out --
// always a full rectangle, whichever weekday the month starts on.
export function buildMonthGrid(year: number, monthIndex0: number): CalendarDay[] {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, monthIndex0, 1 - firstWeekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({ date, iso: toIsoDate(date), inCurrentMonth: date.getMonth() === monthIndex0 });
  }
  return days;
}
