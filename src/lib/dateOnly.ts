// Calendar dates (no time of day) held at midnight UTC, the same convention as
// a date-only clean slot (see isDateOnly in src/lib/schedule.ts), so they never
// shift a day with the server's timezone. Used by the health and safety checks
// and by team tasks.

export function parseDateOnly(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  // Rejects 2026-02-31 and the like, which Date would quietly roll forward.
  return date.getUTCMonth() === Number(m) - 1 ? date : null;
}

export function todayDateOnly(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// For an <input type="date"> value.
export function toDateInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "12 Nov 25".
export function formatDateOnly(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCFullYear() % 100)}`;
}

// A moment in time as UK wall-clock time: "12 Nov 25, 14:30". For things that
// happened at a time of day, such as an update on a task.
export function formatDateTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.year.slice(-2)}, ${parts.hour}:${parts.minute}`;
}

// Adds whole months, stopping at the end of a shorter month rather than
// spilling into the next one (31 January plus one month is 28 February).
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}
