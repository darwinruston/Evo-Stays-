// Health and safety checks a short-let property usually has to keep renewing,
// and the date arithmetic that turns "last done on" into "next due". Pure
// functions: the property page, the actions and the reminder job all read from
// here, so they agree on what "due soon" means.
//
// The standard list is a starting point, not legal advice. What a property
// actually needs depends on where it is and how it is let, so every check can
// be marked as not needed, have its interval changed, or be added to.

export type SafetyCheckTemplate = {
  key: string;
  title: string;
  // One plain line on what it is, shown under the title.
  what: string;
  intervalMonths: number;
};

export const SAFETY_CHECK_TEMPLATES: SafetyCheckTemplate[] = [
  {
    key: "gas-safety",
    title: "Gas safety certificate",
    what: "Annual check of gas appliances and pipework by a Gas Safe engineer. Only if the property has gas.",
    intervalMonths: 12,
  },
  {
    key: "electrical",
    title: "Electrical safety report (EICR)",
    what: "Inspection of the fixed electrics by a qualified electrician, usually every five years.",
    intervalMonths: 60,
  },
  {
    key: "fire-risk",
    title: "Fire risk assessment",
    what: "Written assessment of fire risks and escape routes, reviewed regularly.",
    intervalMonths: 12,
  },
  {
    key: "alarms",
    title: "Smoke and carbon monoxide alarms tested",
    what: "Test every alarm and replace flat batteries.",
    intervalMonths: 1,
  },
  {
    key: "fire-equipment",
    title: "Fire extinguishers and fire blanket",
    what: "Check they are in place, in date and serviced.",
    intervalMonths: 12,
  },
  {
    key: "pat",
    title: "Portable appliance testing (PAT)",
    what: "Test of the plug-in appliances guests use, such as kettles, toasters and lamps.",
    intervalMonths: 12,
  },
  {
    key: "legionella",
    title: "Legionella risk assessment",
    what: "Assessment of the water system, reviewed every couple of years or when it changes.",
    intervalMonths: 24,
  },
  {
    key: "insurance",
    title: "Building and liability insurance",
    what: "The renewal date of the cover for the property and for guests.",
    intervalMonths: 12,
  },
  {
    key: "epc",
    title: "Energy performance certificate (EPC)",
    what: "Rating of the property's energy efficiency, valid for ten years.",
    intervalMonths: 120,
  },
];

export const SAFETY_INTERVAL_MAX_MONTHS = 240;
export const SAFETY_TITLE_MAX = 80;
export const SAFETY_NOTE_MAX = 300;

export function templateFor(key: string | null): SafetyCheckTemplate | null {
  return SAFETY_CHECK_TEMPLATES.find((t) => t.key === key) ?? null;
}

// Dates in this feature are calendar dates held at midnight UTC, the same
// convention as a date-only clean slot (see isDateOnly in src/lib/schedule.ts),
// so they never shift a day with the server's timezone.
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

// dd/mm/yyyy.
export function formatDateOnly(date: Date): string {
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

// Adds whole months, stopping at the end of a shorter month rather than
// spilling into the next one (31 January plus one month is 28 February).
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function dueDateFor(lastCompletedOn: Date, intervalMonths: number): Date {
  return addMonths(lastCompletedOn, intervalMonths);
}

const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

// How far ahead staff are told a check is coming up: a week for something
// that repeats monthly, a month for the yearly ones, three months for the
// five and ten year certificates that take time to arrange.
export function reminderLeadDays(intervalMonths: number): number {
  if (intervalMonths <= 3) return 7;
  if (intervalMonths < 24) return 30;
  return 90;
}

export type SafetyState = "not-needed" | "not-recorded" | "ok" | "due-soon" | "overdue";

export type SafetyCheckLike = {
  intervalMonths: number;
  dueOn: Date | null;
  notApplicable: boolean;
};

export function safetyState(check: SafetyCheckLike, now = new Date()): { state: SafetyState; days: number | null } {
  if (check.notApplicable) return { state: "not-needed", days: null };
  if (!check.dueOn) return { state: "not-recorded", days: null };
  const days = daysBetween(todayDateOnly(now), check.dueOn);
  if (days < 0) return { state: "overdue", days };
  if (days <= reminderLeadDays(check.intervalMonths)) return { state: "due-soon", days };
  return { state: "ok", days };
}

// "Overdue by 12 days", "Due today", "Due in 20 days", "Up to date".
export function safetyStatusLabel(state: SafetyState, days: number | null): string {
  const plural = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  switch (state) {
    case "overdue":
      return `Overdue by ${plural(Math.abs(days ?? 0))}`;
    case "due-soon":
      return days === 0 ? "Due today" : `Due in ${plural(days ?? 0)}`;
    case "ok":
      return "Up to date";
    case "not-recorded":
      return "Not recorded";
    case "not-needed":
      return "Not needed here";
  }
}

// A check as the property page shows it: the standard ones always, whether or
// not a row exists yet, then anything the manager added.
export type SafetyCheckRow = {
  id: string;
  templateKey: string | null;
  title: string;
  intervalMonths: number;
  lastCompletedOn: Date | null;
  dueOn: Date | null;
  note: string | null;
  notApplicable: boolean;
};

export type SafetyCheckEntry = {
  // What an action is sent to identify it: "template:gas-safety" before a row
  // exists for it, "id:<id>" after (and always for one the manager added).
  ref: string;
  title: string;
  what: string | null;
  custom: boolean;
  intervalMonths: number;
  lastCompletedOn: Date | null;
  dueOn: Date | null;
  note: string | null;
  notApplicable: boolean;
};

export function buildSafetyEntries(rows: SafetyCheckRow[]): SafetyCheckEntry[] {
  const byKey = new Map(rows.filter((r) => r.templateKey).map((r) => [r.templateKey as string, r]));
  const standard = SAFETY_CHECK_TEMPLATES.map((t): SafetyCheckEntry => {
    const row = byKey.get(t.key);
    return {
      ref: row ? `id:${row.id}` : `template:${t.key}`,
      title: t.title,
      what: t.what,
      custom: false,
      intervalMonths: row?.intervalMonths ?? t.intervalMonths,
      lastCompletedOn: row?.lastCompletedOn ?? null,
      dueOn: row?.dueOn ?? null,
      note: row?.note ?? null,
      notApplicable: row?.notApplicable ?? false,
    };
  });
  const custom = rows
    .filter((r) => !r.templateKey)
    .map(
      (r): SafetyCheckEntry => ({
        ref: `id:${r.id}`,
        title: r.title,
        what: null,
        custom: true,
        intervalMonths: r.intervalMonths,
        lastCompletedOn: r.lastCompletedOn,
        dueOn: r.dueOn,
        note: r.note,
        notApplicable: r.notApplicable,
      }),
    );
  return [...standard, ...custom];
}

export function describeInterval(months: number): string {
  if (months === 1) return "every month";
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "every year" : `every ${years} years`;
  }
  return `every ${months} months`;
}
