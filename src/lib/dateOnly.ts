import { currentRegion } from "@/lib/region";

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

// "12 Nov 25", or "Nov 12, 25" where the company's country writes the month
// first.
export function formatDateOnly(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const year = pad(date.getUTCFullYear() % 100);
  return currentRegion().dateOrder === "mdy" ? `${month} ${date.getUTCDate()}, ${year}` : `${date.getUTCDate()} ${month} ${year}`;
}

// A moment in time as wall-clock time: "12 Nov 25, 14:30" (or "Nov 12, 25,
// 2:30 PM" where the company's country writes it that way). For things that
// happened at a time of day, such as an update on a task. In the time zone of
// the server, like every other time in the app (see src/lib/region.ts).
export function formatDateTime(date: Date): string {
  const region = currentRegion();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(region.locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const month = MONTHS[Number(parts.month) - 1];
  const year = String(parts.year).slice(-2);
  // 24-hour clocks pad the hour ("09:05"); 12-hour ones do not ("9:05 AM").
  const hour = parts.dayPeriod ? parts.hour : String(parts.hour).padStart(2, "0");
  const clock = `${hour}:${parts.minute}${parts.dayPeriod ? ` ${String(parts.dayPeriod).toUpperCase()}` : ""}`;
  return region.dateOrder === "mdy"
    ? `${month} ${Number(parts.day)}, ${year}, ${clock}`
    : `${Number(parts.day)} ${month} ${year}, ${clock}`;
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
