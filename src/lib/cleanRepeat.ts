// The arithmetic of repeating cleans. Pure functions, safe in the browser (the
// schedule form uses the labels). Making and removing the cleans themselves is
// in src/lib/cleanSeries.ts.

export const CLEAN_FREQUENCIES = ["WEEKLY", "FORTNIGHTLY", "FOUR_WEEKLY", "MONTHLY", "QUARTERLY"] as const;
export type CleanFrequencyValue = (typeof CLEAN_FREQUENCIES)[number];

export const CLEAN_FREQUENCY_LABELS: Record<CleanFrequencyValue, string> = {
  WEEKLY: "Every week",
  FORTNIGHTLY: "Every 2 weeks",
  FOUR_WEEKLY: "Every 4 weeks",
  MONTHLY: "Every month",
  QUARTERLY: "Every 3 months",
};

export function isCleanFrequency(value: unknown): value is CleanFrequencyValue {
  return typeof value === "string" && (CLEAN_FREQUENCIES as readonly string[]).includes(value);
}

// How far ahead the cleans of a repeating series are made, so they are in
// everyone's calendar without filling it for years.
export const SERIES_AHEAD_DAYS = 84;

const WEEKS: Partial<Record<CleanFrequencyValue, number>> = { WEEKLY: 1, FORTNIGHTLY: 2, FOUR_WEEKLY: 4 };
const MONTHS: Partial<Record<CleanFrequencyValue, number>> = { MONTHLY: 1, QUARTERLY: 3 };

// The date and time of the nth clean of a series (0 is the first). Always
// counted from the start, so a monthly clean on the 31st goes to the end of a
// short month and back to the 31st afterwards. Built from calendar parts, so
// the time of day stays the same across a clock change.
export function occurrenceDate(start: Date, frequency: CleanFrequencyValue, n: number): Date {
  const [y, m, d, h, min] = [start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()];
  const weeks = WEEKS[frequency];
  if (weeks) return new Date(y, m, d + 7 * weeks * n, h, min);
  const month = m + (MONTHS[frequency] ?? 1) * n;
  const lastDay = new Date(y, month + 1, 0).getDate();
  return new Date(y, month, Math.min(d, lastDay), h, min);
}
