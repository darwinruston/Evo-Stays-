import type { IssueCategory, IssueSeverity, IssueStatus } from "@prisma/client";

// Short names, used everywhere an issue is listed or notified about
// ("Urgent: no water or hot water at Riverside Loft"). Each is a fact a
// cleaner can see, not a judgement -- severity is worked out from these by
// assessIssueSeverity (src/lib/issueSeverity.ts), never chosen by the
// person reporting.
export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  SAFETY_HAZARD: "Safety hazard",
  LEAK: "Leak or flooding",
  NO_WATER: "No water or hot water",
  NO_POWER: "No power",
  NO_HEATING: "No heating",
  TOILET: "Toilet or drain blocked",
  ACCESS: "Lock or key safe problem",
  APPLIANCE: "Appliance not working",
  PESTS: "Pests",
  BROKEN: "Something broken",
  DAMAGE: "Guest damage",
  MISSING_ITEM: "Something missing",
  LOST_PROPERTY: "Guest left something",
  OTHER: "Something else",
};

// Examples shown beside each choice in the report form, so the cleaner can
// pick the right one quickly without having to interpret the category.
export const ISSUE_CATEGORY_HINTS: Partial<Record<IssueCategory, string>> = {
  SAFETY_HAZARD: "gas smell, exposed wiring, smoke alarm faulty",
  LEAK: "water coming through, pooling, dripping ceiling",
  NO_POWER: "tripped electrics, no lights or sockets",
  TOILET: "won't flush, blocked sink or shower",
  ACCESS: "door or window lock, key safe, smart lock",
  APPLIANCE: "oven, fridge, washing machine, Wi-Fi, TV",
  PESTS: "mice, insects, droppings",
  BROKEN: "furniture, fixtures, fittings",
  DAMAGE: "stains, marks, breakages",
  MISSING_ITEM: "linen, kitchenware, inventory",
};

// The order the report form lists them in: what stops a stay first, so the
// most important choices are nearest the top of a phone screen.
export const ISSUE_CATEGORY_ORDER: IssueCategory[] = [
  "SAFETY_HAZARD",
  "LEAK",
  "NO_WATER",
  "NO_POWER",
  "NO_HEATING",
  "TOILET",
  "ACCESS",
  "APPLIANCE",
  "PESTS",
  "BROKEN",
  "DAMAGE",
  "MISSING_ITEM",
  "LOST_PROPERTY",
  "OTHER",
];

// Worded as the decision staff are actually making, not an abstract
// low/medium/high -- see the IssueSeverity comment in schema.prisma.
export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: "Can wait",
  MEDIUM: "Fix soon",
  URGENT: "Before next guests",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

// Most urgent first -- how every issue list is ordered, so the thing that
// has to be sorted before tonight's check-in is never below something that
// can wait a fortnight. Prisma sorts enums by declaration order (LOW first),
// so this is applied in JS rather than as an orderBy.
const SEVERITY_RANK: Record<IssueSeverity, number> = { URGENT: 0, MEDIUM: 1, LOW: 2 };

export function sortIssuesByUrgency<T extends { severity: IssueSeverity; createdAt: Date }>(issues: T[]): T[] {
  return [...issues].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

// Own keys only -- a plain `in` check would also accept inherited names like
// "toString" or "constructor", which then fail at the database instead of
// being rejected here.
export function isIssueCategory(value: unknown): value is IssueCategory {
  return typeof value === "string" && Object.hasOwn(ISSUE_CATEGORY_LABELS, value);
}

export function isIssueSeverity(value: unknown): value is IssueSeverity {
  return typeof value === "string" && Object.hasOwn(ISSUE_SEVERITY_LABELS, value);
}

export function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === "string" && Object.hasOwn(ISSUE_STATUS_LABELS, value);
}

// Upper bound on what a report can say -- generous for "the shower tray is
// cracked along the back edge, water getting under it", but stops a pasted
// novel from bloating every list and notification it appears in.
export const ISSUE_DESCRIPTION_MAX = 2000;
