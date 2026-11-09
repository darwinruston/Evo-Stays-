// How many people cleaned a visit, the cleaner who is logged in included. A
// cleaner sometimes arrives with a helper or a whole team, and they are all on
// the clock, so the invoice bills people x time (see src/lib/invoices.ts).

export const TEAM_SIZE_MAX = 10;

// A whole number from 1 to TEAM_SIZE_MAX, or null if it is anything else.
export function parseTeamSize(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d{1,2}$/.test(raw.trim())) return null;
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= TEAM_SIZE_MAX ? n : null;
}

// "Just you", "2 people".
export function teamLabel(size: number): string {
  return size === 1 ? "Just you" : `${size} people`;
}

// "1 person", "2 people", for staff-facing text.
export function peopleCount(size: number): string {
  return `${size} ${size === 1 ? "person" : "people"}`;
}
