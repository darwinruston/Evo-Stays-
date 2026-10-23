// Spam protection for the public Contact form. Anyone on the internet can
// post to it, so each sender (by network address) and each email address is
// limited to a few messages an hour. In memory on purpose, like the login
// limiter (src/lib/loginRateLimit.ts): this is one long-running server, and a
// restart clearing the counts is fine.

const WINDOW_MS = 60 * 60_000;
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;
const MAX_ENTRIES = 5_000;

type Entry = { count: number; windowStart: number };

const byIp = new Map<string, Entry>();
const byEmail = new Map<string, Entry>();

function bump(map: Map<string, Entry>, key: string, now: number): number {
  const existing = map.get(key);
  const entry =
    existing && now - existing.windowStart < WINDOW_MS ? existing : { count: 0, windowStart: now };
  entry.count += 1;
  map.set(key, entry);
  if (map.size > MAX_ENTRIES) {
    // Drop expired entries first, then the oldest, so a flood of made-up
    // addresses can't grow this without limit.
    for (const [k, e] of map) if (now - e.windowStart >= WINDOW_MS) map.delete(k);
    while (map.size > MAX_ENTRIES) map.delete(map.keys().next().value as string);
  }
  return entry.count;
}

// Counts this attempt and says whether it is over the limit.
export function contactLimited(ip: string | null, email: string): boolean {
  const now = Date.now();
  const ipCount = ip ? bump(byIp, ip, now) : 0;
  const emailCount = bump(byEmail, email.trim().toLowerCase(), now);
  return ipCount > MAX_PER_IP || emailCount > MAX_PER_EMAIL;
}
