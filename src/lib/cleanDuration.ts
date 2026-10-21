// How long a clean at one property usually takes, learned from the visits
// cleaners have already recorded (check-in to check-out: the same times the
// invoices are built from, but not the billed hours, which a minimum-hours
// rule can pad). Pure functions, so the rule is easy to test on its own.
//
// It builds up over time. With no history it's just the default; the first
// few visits pull it gently towards what's really happening (the default
// counts as a few "visits" of its own), and from MIN_FOR_MEDIAN visits on it's
// the middle of the recent ones, which one forgotten check-out can't skew.

// Visits older than the most recent RECENT_VISITS don't count: a property
// changes (a refit, a different layout) and the estimate should follow.
export const RECENT_VISITS = 10;
// How many visits it takes before the default stops being mixed in.
export const MIN_FOR_MEDIAN = 3;
// A "clean" outside this range is a forgotten check-out, or a visit that
// wasn't really a clean, not something to learn from.
const MIN_PLAUSIBLE_MINUTES = 15;
const MAX_PLAUSIBLE_MINUTES = 8 * 60;

export type CleanEstimate = {
  minutes: number;
  // How many recorded visits it's based on (0 means it's just the default).
  sample: number;
  // True once it rests on real visits rather than mostly on the default.
  learned: boolean;
};

export function visitMinutes(arrivedAt: Date, departedAt: Date): number | null {
  const minutes = (departedAt.getTime() - arrivedAt.getTime()) / 60_000;
  return minutes >= MIN_PLAUSIBLE_MINUTES && minutes <= MAX_PLAUSIBLE_MINUTES ? minutes : null;
}

function roundTo5(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

// `recentMinutes` is newest-first; only the latest RECENT_VISITS are used.
export function estimateCleanMinutes(recentMinutes: number[], defaultMinutes: number): CleanEstimate {
  const used = recentMinutes.slice(0, RECENT_VISITS);
  const n = used.length;
  if (n === 0) return { minutes: roundTo5(defaultMinutes), sample: 0, learned: false };

  if (n >= MIN_FOR_MEDIAN) {
    const sorted = [...used].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { minutes: roundTo5(median), sample: n, learned: true };
  }

  // One or two visits: mix in the default as if it had been seen enough
  // times to make up MIN_FOR_MEDIAN.
  const total = used.reduce((sum, m) => sum + m, 0) + defaultMinutes * (MIN_FOR_MEDIAN - n);
  return { minutes: roundTo5(total / MIN_FOR_MEDIAN), sample: n, learned: false };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
