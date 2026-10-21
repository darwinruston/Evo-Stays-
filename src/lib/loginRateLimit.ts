// Brute-force protection for the login form. Once the app is reachable from
// the public internet, nothing else stops a script from trying passwords
// as fast as bcrypt will check them.
//
// Failures are counted twice, per email and per client IP:
//  - per email stops a slow, distributed guess at one account
//  - per IP stops one machine spraying a common password across every
//    account it can think of
// Either one tripping blocks the attempt. A successful login clears that
// email's count, but not the IP's, so a valid account can't be used to
// reset the counter between guesses at others.
//
// In memory on purpose. This is a single long-running `node server.js` (see
// the Dockerfile), so there is no second instance to share state with, and
// a restart clearing the counts is fine.

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
// Upper bound on tracked keys, so a flood of made-up emails can't grow this
// without limit. Expired entries are dropped first; past that, the oldest go.
const MAX_ENTRIES = 10_000;

type Entry = { failures: number; windowStart: number };

const byEmail = new Map<string, Entry>();
const byIp = new Map<string, Entry>();

function live(map: Map<string, Entry>, key: string, now: number): Entry | undefined {
  const entry = map.get(key);
  if (entry && now - entry.windowStart >= WINDOW_MS) {
    map.delete(key);
    return undefined;
  }
  return entry;
}

function prune(map: Map<string, Entry>, now: number) {
  if (map.size < MAX_ENTRIES) return;
  for (const [key, entry] of map) {
    if (now - entry.windowStart >= WINDOW_MS) map.delete(key);
  }
  // Maps iterate in insertion order, so this drops the oldest windows.
  for (const key of map.keys()) {
    if (map.size < MAX_ENTRIES) break;
    map.delete(key);
  }
}

function bump(map: Map<string, Entry>, key: string, now: number) {
  const entry = live(map, key, now);
  if (entry) {
    entry.failures += 1;
  } else {
    prune(map, now);
    map.set(key, { failures: 1, windowStart: now });
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The public URL sits behind a reverse proxy (Tailscale Funnel or Cloudflare
// Tunnel), which appends the real client address to X-Forwarded-For. Only
// the last entry is trusted. Anything before it came from the client, who
// could put any value there. Next fills the header in from the socket when
// no proxy did, so a direct connection on the tailnet gets its device's IP.
//
// Null when that address is loopback, which means a proxy on the same
// machine forwarded the request without saying who it was for. Those skip
// the per-IP limit rather than all sharing one bucket, where one person's
// typos could lock out everyone.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function clientIp(headers: Headers): string | null {
  const last = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last && !LOOPBACK.has(last) ? last : null;
}

export function isLoginBlocked(email: string, ip: string | null): boolean {
  const now = Date.now();
  const emailEntry = live(byEmail, normaliseEmail(email), now);
  const ipEntry = ip ? live(byIp, ip, now) : undefined;
  return (
    (emailEntry?.failures ?? 0) >= MAX_FAILURES_PER_EMAIL ||
    (ipEntry?.failures ?? 0) >= MAX_FAILURES_PER_IP
  );
}

export function recordLoginFailure(email: string, ip: string | null) {
  const now = Date.now();
  bump(byEmail, normaliseEmail(email), now);
  if (ip) bump(byIp, ip, now);
}

export function recordLoginSuccess(email: string) {
  byEmail.delete(normaliseEmail(email));
}
