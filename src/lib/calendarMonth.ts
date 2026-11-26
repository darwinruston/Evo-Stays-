// The month a calendar page is showing, as kept in its address (?month=2026-11).
// Shared by the cleaner's calendar and the office one.

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseMonth(raw: string | undefined): { year: number; monthIndex0: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, monthIndex0: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex0: now.getMonth() };
}

export function monthParam(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}
