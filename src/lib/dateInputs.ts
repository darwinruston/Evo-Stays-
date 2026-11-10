// Date-input helpers that are safe to use in the browser (a client form imports
// them), so they must not depend on anything server-only. The rest of the
// scheduling helpers live in src/lib/schedule.ts, which reads the company's
// region and is server-side.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// YYYY-MM-DD in local time -- used as both the calendar grid's per-day key
// and the ?day= query param, so it must never drift with timezone/UTC
// conversion the way toISOString() would. Internal/machine use only --
// for anything a person reads, use formatDate in src/lib/schedule.ts instead.
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local-time value an <input type="datetime-local"> expects for its
// defaultValue -- toISOString() would silently shift the displayed time by
// the server's UTC offset.
export function toDateTimeLocalValue(date: Date): string {
  return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
