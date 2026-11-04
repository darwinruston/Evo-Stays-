// Health and safety checks a short-let property usually has to keep renewing,
// and the date arithmetic that turns "last done on" into "next due". Pure
// functions: the property page, the actions and the reminder job all read from
// here, so they agree on what "due soon" means.
//
// The standard list is a starting point, not legal advice. What a property
// actually needs depends on where it is and how it is let, so every check can
// be marked as not needed, have its interval changed, or be added to.

// How a property is managed decides which checks it gets: a holiday let, a
// home let on a tenancy and a shared house each have different ones.
export type Management = "SHORT_LET" | "LONG_LET" | "HMO";

export const MANAGEMENT_TYPES: Management[] = ["SHORT_LET", "LONG_LET", "HMO"];

export const MANAGEMENT_LABELS: Record<Management, string> = {
  SHORT_LET: "Short let",
  LONG_LET: "Long let",
  HMO: "HMO (shared house)",
};

export const MANAGEMENT_HINTS: Record<Management, string> = {
  SHORT_LET: "holiday lets and short stays, with guests coming and going",
  LONG_LET: "a home let to one household on a tenancy",
  HMO: "a house shared by several unrelated tenants",
};

export function isManagement(value: unknown): value is Management {
  return typeof value === "string" && (MANAGEMENT_TYPES as string[]).includes(value);
}

export type SafetyCheckTemplate = {
  key: string;
  title: string;
  // One plain line on what it is, shown under the title.
  what: string;
  intervalMonths: number;
  // Which kinds of property get it.
  appliesTo: Management[];
  // Where the usual interval differs for one kind of property.
  intervalFor?: Partial<Record<Management, number>>;
};

const ALL: Management[] = ["SHORT_LET", "LONG_LET", "HMO"];

export const SAFETY_CHECK_TEMPLATES: SafetyCheckTemplate[] = [
  {
    key: "gas-safety",
    title: "Gas safety certificate",
    what: "Annual check of gas appliances and pipework by a Gas Safe engineer. Only if the property has gas.",
    intervalMonths: 12,
    appliesTo: ALL,
  },
  {
    key: "electrical",
    title: "Electrical safety report (EICR)",
    what: "Inspection of the fixed electrics by a qualified electrician, usually every five years.",
    intervalMonths: 60,
    appliesTo: ALL,
  },
  {
    key: "hmo-licence",
    title: "HMO licence",
    what: "The council licence for a shared house, usually valid for up to five years.",
    intervalMonths: 60,
    appliesTo: ["HMO"],
  },
  {
    key: "fire-risk",
    title: "Fire risk assessment",
    what: "Written assessment of fire risks and escape routes, reviewed regularly.",
    intervalMonths: 12,
    appliesTo: ["SHORT_LET", "HMO"],
  },
  {
    key: "fire-alarm-system",
    title: "Fire alarm system service",
    what: "Service and test of the fire alarm system by a competent engineer.",
    intervalMonths: 12,
    appliesTo: ["HMO"],
  },
  {
    key: "emergency-lighting",
    title: "Emergency lighting test",
    what: "Test of the emergency lighting on escape routes. Only if the property has it.",
    intervalMonths: 12,
    appliesTo: ["HMO"],
  },
  {
    key: "alarms",
    title: "Smoke and carbon monoxide alarms tested",
    what: "Test every alarm and replace flat batteries.",
    intervalMonths: 1,
    intervalFor: { LONG_LET: 6 },
    appliesTo: ALL,
  },
  {
    key: "fire-equipment",
    title: "Fire extinguishers and fire blanket",
    what: "Check they are in place, in date and serviced.",
    intervalMonths: 12,
    appliesTo: ["SHORT_LET", "HMO"],
  },
  {
    key: "pat",
    title: "Portable appliance testing (PAT)",
    what: "Test of the plug-in appliances tenants and guests use, such as kettles, toasters and lamps.",
    intervalMonths: 12,
    appliesTo: ["SHORT_LET", "HMO"],
  },
  {
    key: "legionella",
    title: "Legionella risk assessment",
    what: "Assessment of the water system, reviewed every couple of years or when it changes.",
    intervalMonths: 24,
    appliesTo: ALL,
  },
  {
    key: "insurance",
    title: "Building and liability insurance",
    what: "The renewal date of the cover for the property.",
    intervalMonths: 12,
    appliesTo: ALL,
  },
  {
    key: "epc",
    title: "Energy performance certificate (EPC)",
    what: "Rating of the property's energy efficiency, valid for ten years.",
    intervalMonths: 120,
    appliesTo: ALL,
  },
];

// The checks a property of this kind gets, in the order they are shown.
export function templatesFor(management: Management): SafetyCheckTemplate[] {
  return SAFETY_CHECK_TEMPLATES.filter((t) => t.appliesTo.includes(management));
}

export function defaultIntervalFor(template: SafetyCheckTemplate, management: Management): number {
  return template.intervalFor?.[management] ?? template.intervalMonths;
}

import { addMonths, daysBetween, todayDateOnly } from "@/lib/dateOnly";

export const SAFETY_INTERVAL_MAX_MONTHS = 240;
export const SAFETY_TITLE_MAX = 80;
export const SAFETY_NOTE_MAX = 300;

export function templateByKey(key: string | null): SafetyCheckTemplate | null {
  return SAFETY_CHECK_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function dueDateFor(lastCompletedOn: Date, intervalMonths: number): Date {
  return addMonths(lastCompletedOn, intervalMonths);
}

// The three advance reminders, widest first: three months, a month and a week
// before a check is due. A stage only applies to a check that repeats less
// often than that lead, so a monthly check is not announced three months ahead
// of a date that is only one month away.
export const REMINDER_STAGES: { stage: 1 | 2 | 3; days: number; label: string }[] = [
  { stage: 1, days: 90, label: "3 months" },
  { stage: 2, days: 30, label: "a month" },
  { stage: 3, days: 7, label: "a week" },
];

function applicableStages(intervalMonths: number) {
  return REMINDER_STAGES.filter((s) => s.days < intervalMonths * 30);
}

// The furthest ahead a check is flagged as coming up.
export function reminderLeadDays(intervalMonths: number): number {
  return applicableStages(intervalMonths)[0]?.days ?? 7;
}

// The latest reminder stage a check has reached with this many days to go:
// 0 if it is still further off than the first, otherwise 1, 2 or 3.
export function reminderStageFor(daysLeft: number, intervalMonths: number): 0 | 1 | 2 | 3 {
  const reached = applicableStages(intervalMonths).filter((s) => daysLeft <= s.days);
  return reached.length === 0 ? 0 : reached[reached.length - 1].stage;
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

// Rows for a standard check that this kind of property doesn't get (it was
// changed from a short let to a long let, say) are left out rather than
// deleted, so switching back brings the recorded dates back too.
export function buildSafetyEntries(rows: SafetyCheckRow[], management: Management): SafetyCheckEntry[] {
  const byKey = new Map(rows.filter((r) => r.templateKey).map((r) => [r.templateKey as string, r]));
  const standard = templatesFor(management).map((t): SafetyCheckEntry => {
    const row = byKey.get(t.key);
    return {
      ref: row ? `id:${row.id}` : `template:${t.key}`,
      title: t.title,
      what: t.what,
      custom: false,
      intervalMonths: row?.intervalMonths ?? defaultIntervalFor(t, management),
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
