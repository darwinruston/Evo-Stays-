// The first-run setup questions, and how the answers turn into the module
// switches on Organisation. Plain data and pure functions so the question
// screen (client) and the action that saves the answers (server) read from
// the same definition and can't drift apart.

export type BusinessType = "PROPERTY_MANAGER" | "CLEANING_COMPANY" | "HOST" | "MIXED";

export type Modules = {
  laundry: boolean;
  stock: boolean;
  invoicing: boolean;
  sync: boolean;
};

export const ALL_MODULES_ON: Modules = { laundry: true, stock: true, invoicing: true, sync: true };

export type Answers = {
  businessType: BusinessType;
  bookings: "pms" | "calendars" | "manual";
  invoicing: "yes" | "no";
  laundry: "track" | "ourselves" | "none";
  stock: "yes" | "no";
};

export type QuestionKey = keyof Answers;

export type Question = {
  key: QuestionKey;
  title: string;
  hint?: string;
  options: { value: string; label: string; description: string }[];
};

export const QUESTIONS: Question[] = [
  {
    key: "businessType",
    title: "What best describes you?",
    hint: "This helps us set Evo Stays up the way you work. You can change anything later.",
    options: [
      {
        value: "PROPERTY_MANAGER",
        label: "Property manager",
        description: "I look after short-let properties for owners.",
      },
      {
        value: "CLEANING_COMPANY",
        label: "Cleaning company",
        description: "I clean properties for other businesses and run my own cleaners.",
      },
      {
        value: "HOST",
        label: "Host",
        description: "I run my own properties and have my own cleaners.",
      },
      { value: "MIXED", label: "A mix of these", description: "More than one of the above." },
    ],
  },
  {
    key: "bookings",
    title: "How do you find out when a clean is needed?",
    options: [
      {
        value: "pms",
        label: "From my booking system",
        description: "A property management system such as Hostify, Guesty or Hostaway.",
      },
      {
        value: "calendars",
        label: "From calendar links",
        description: "Airbnb, Vrbo or Booking.com calendar links.",
      },
      {
        value: "manual",
        label: "I add cleans myself",
        description: "I schedule each clean by hand.",
      },
    ],
  },
  {
    key: "invoicing",
    title: "Do you want invoices made from your cleaners' hours?",
    hint: "Evo Stays doesn't handle payments. It totals the hours each cleaner has worked into an invoice they can use to bill you.",
    options: [
      {
        value: "yes",
        label: "Yes, create invoices from their hours",
        description: "Each cleaner's hours are added up into an invoice.",
      },
      {
        value: "no",
        label: "No, I don't need invoices",
        description: "Hours and invoices aren't tracked in Evo Stays.",
      },
    ],
  },
  {
    key: "laundry",
    title: "How do you handle laundry?",
    options: [
      {
        value: "track",
        label: "Track it in Evo Stays",
        description: "Record loads that go out and when they come back.",
      },
      {
        value: "ourselves",
        label: "We handle it ourselves",
        description: "It's done in-house, so there's nothing to track here.",
      },
      { value: "none", label: "No laundry", description: "Laundry isn't part of what we do." },
    ],
  },
  {
    key: "stock",
    title: "Do you want cleaners to record stock levels?",
    hint: "Things like toilet roll, bin bags and soap. Cleaners tap High, Medium or Low on each visit.",
    options: [
      { value: "yes", label: "Yes", description: "Cleaners check stock at the end of each clean." },
      { value: "no", label: "No", description: "Leave stock out of the cleaner's steps." },
    ],
  },
];

export function modulesFromAnswers(a: Answers): Modules {
  return {
    laundry: a.laundry === "track",
    stock: a.stock === "yes",
    invoicing: a.invoicing === "yes",
    sync: a.bookings !== "manual",
  };
}

// The plain-language summary shown before finishing and on the Settings
// page: one line per module, so what was just chosen is visible.
export const MODULE_LABELS: Record<keyof Modules, { name: string; on: string; off: string }> = {
  sync: {
    name: "Booking sync",
    on: "Cleans are created from your booking system or calendar links.",
    off: "You add cleans by hand.",
  },
  invoicing: {
    name: "Cleaner invoices",
    on: "Each cleaner's hours are added up into an invoice.",
    off: "Invoices aren't created from cleaner hours.",
  },
  laundry: {
    name: "Laundry",
    on: "Laundry loads are recorded here.",
    off: "Laundry isn't tracked.",
  },
  stock: {
    name: "Stock levels",
    on: "Cleaners record stock on each visit.",
    off: "No stock step for cleaners.",
  },
};

const BUSINESS_TYPES: BusinessType[] = ["PROPERTY_MANAGER", "CLEANING_COMPANY", "HOST", "MIXED"];

// The action that saves the answers can be reached by a direct POST, so
// whatever arrives is checked against the same definitions the screen used.
export function parseAnswers(raw: unknown): Answers | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  for (const q of QUESTIONS) {
    const allowed = q.options.map((o) => o.value);
    if (typeof r[q.key] !== "string" || !allowed.includes(r[q.key] as string)) return null;
  }
  if (!BUSINESS_TYPES.includes(r.businessType as BusinessType)) return null;
  return r as unknown as Answers;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  PROPERTY_MANAGER: "Property manager",
  CLEANING_COMPANY: "Cleaning company",
  HOST: "Host",
  MIXED: "A mix",
};
