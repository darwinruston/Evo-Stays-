// The answers to "How did you hear about us?" on the register interest form.
export const HEARD_FROM = [
  "LinkedIn",
  "Search (Google or similar)",
  "Someone recommended it",
  "An email from us",
  "A group or forum",
  "An event",
  "Somewhere else",
] as const;

// A link tag such as "linkedin" or "article-same-day-turnovers": short, plain
// characters only, since anyone can type anything into a web address.
export function cleanSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tidy = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  return tidy || null;
}
