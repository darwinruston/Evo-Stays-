import type { IssueCategory, IssueSeverity } from "@prisma/client";
import { arrivalDeadline, formatArrival, type Turnover } from "@/lib/turnover";

// How long before the next guests arrive a "fix soon" problem becomes a
// "before next guests" one -- a broken oven with nobody due for a week can
// wait for a convenient repair slot; with guests tomorrow afternoon, it
// can't.
const ESCALATE_WITHIN_MS = 24 * 60 * 60 * 1000;

// Problems that stop a stay outright, whatever the timing -- with why, in
// the words staff will read on the issue.
const STOPS_THE_STAY: Partial<Record<IssueCategory, string>> = {
  SAFETY_HAZARD: "a risk to guests' safety",
  LEAK: "can spread damage quickly and may stop the stay",
  NO_WATER: "guests can't stay without it",
  NO_POWER: "guests can't stay without it",
  ACCESS: "guests may not be able to get in or lock up",
};

// Problems that need fixing but don't stop the next stay on their own --
// they only become urgent when guests are close (see ESCALATE_WITHIN_MS).
const FIX_SOON: Partial<Record<IssueCategory, string>> = {
  APPLIANCE: "needs fixing, but doesn't stop the next stay",
  PESTS: "needs dealing with before it's in a review",
  BROKEN: "needs repairing or replacing",
  MISSING_ITEM: "may need replacing before the next stay",
  OTHER: "not a standard problem, so check it and adjust if needed",
};

// Record-keeping more than repair: nothing here stops anyone staying.
const CAN_WAIT: Partial<Record<IssueCategory, string>> = {
  DAMAGE: "record it for a damage claim; it doesn't stop the next stay",
  LOST_PROPERTY: "return it to the guest; it doesn't affect the property",
};

// October to April: when no heating makes a property unlettable rather than
// just less comfortable.
function isColdMonth(date: Date): boolean {
  const month = date.getMonth(); // 0 = January
  return month >= 9 || month <= 3;
}

// `reason` is just the "why" ("guests can't stay without it") -- screens and
// notifications already show which problem it is, so it isn't repeated.
export type SeverityAssessment = { severity: IssueSeverity; reason: string };

// Works out how urgent a reported problem is from facts alone -- what's
// wrong, the property it's at, and when the next guests are due -- so the
// person reporting it (usually a cleaner) is never the one deciding.
// Staff can still override the result on the issue page. Pure apart from
// the inputs, so every rule here can be read and tested on its own.
//
// Rules, in order:
// 1. Things that stop a stay (safety, leaks, no water/power, locks) are
//    always "before next guests". So is a blocked toilet when it's the only
//    bathroom, and no heating in the colder months.
// 2. Things that need fixing (appliances, pests, breakages, missing items,
//    anything unclassified) are "fix soon" -- escalated to "before next
//    guests" when the next guests are due within 24 hours.
// 3. Guest damage and lost property are record-keeping: "can wait".
export function assessIssueSeverity(input: {
  category: IssueCategory;
  bathrooms: number | null;
  nextArrival: Turnover | null;
  now: Date;
}): SeverityAssessment {
  const { category, bathrooms, nextArrival, now } = input;

  const stops = STOPS_THE_STAY[category];
  if (stops) return { severity: "URGENT", reason: stops };

  if (category === "TOILET") {
    // Null bathrooms (not recorded) is treated as one -- the cautious read.
    if (bathrooms === null || bathrooms <= 1) return { severity: "URGENT", reason: "it's the only bathroom" };
    return escalateIfGuestsSoon(
      { severity: "MEDIUM", reason: "there's another bathroom, so it doesn't stop the stay" },
      nextArrival,
      now,
    );
  }

  if (category === "NO_HEATING") {
    if (isColdMonth(now)) return { severity: "URGENT", reason: "it's the colder part of the year" };
    return escalateIfGuestsSoon({ severity: "MEDIUM", reason: "less pressing in the warmer months" }, nextArrival, now);
  }

  const soon = FIX_SOON[category];
  if (soon) return escalateIfGuestsSoon({ severity: "MEDIUM", reason: soon }, nextArrival, now);

  return { severity: "LOW", reason: CAN_WAIT[category] ?? "doesn't stop the next stay" };
}

function escalateIfGuestsSoon(
  base: SeverityAssessment,
  nextArrival: Turnover | null,
  now: Date,
): SeverityAssessment {
  if (!nextArrival) return base;
  const untilGuests = arrivalDeadline(nextArrival).getTime() - now.getTime();
  if (untilGuests > ESCALATE_WITHIN_MS) return base;
  return {
    severity: "URGENT",
    reason:
      untilGuests <= 0
        ? "guests are due now or already there"
        : `the next guests are due ${formatArrival(nextArrival)}`,
  };
}
