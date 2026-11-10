// Quick ranges for picking an invoice period: "This month", "Last month", "Last
// week" and "Year to date". Each is a pair of calendar days, both included (the
// "To" box is the last included day, see runInvoiceGeneration). Local dates,
// like the rest of the scheduling: "today" is the day on the person's own
// calendar.

export type PeriodShortcut = { key: string; label: string; from: string; to: string };

function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function periodShortcuts(now: Date = new Date()): PeriodShortcut[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  // The last whole Monday-to-Sunday week, Monday first like the calendar
  // elsewhere in the app. If today is a Monday that is the week just ended.
  const sinceMonday = (today.getDay() + 6) % 7;
  const lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(today.getDate() - sinceMonday - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

  return [
    { key: "last-week", label: "Last week", from: iso(lastWeekStart), to: iso(lastWeekEnd) },
    { key: "this-month", label: "This month", from: iso(monthStart), to: iso(today) },
    { key: "last-month", label: "Last month", from: iso(lastMonthStart), to: iso(lastMonthEnd) },
    { key: "year-to-date", label: "Year to date", from: iso(yearStart), to: iso(today) },
  ];
}
