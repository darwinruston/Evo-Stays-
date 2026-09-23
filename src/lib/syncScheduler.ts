import { runAllSyncs } from "@/lib/runAllSyncs";

const DEFAULT_INTERVAL_MINUTES = 30;
// First pass shortly after boot rather than waiting a full interval for
// cleans to start appearing on a freshly (re)started server.
const INITIAL_DELAY_MS = 60_000;

function intervalMs(): number {
  const raw = process.env.SYNC_INTERVAL_MINUTES;
  const minutes = raw ? Number.parseFloat(raw) : NaN;
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_INTERVAL_MINUTES) * 60_000;
}

// Self-hosted via Docker, not Vercel -- there's no platform cron to lean on,
// so this in-process interval is what actually makes syncing automatic for
// a single long-running `node server.js`. Errors are logged, never thrown --
// an unhandled rejection here must not crash the timer (or the process).
export function startSyncScheduler(): void {
  const run = () => {
    runAllSyncs().catch((err) => {
      console.error("[sync scheduler] run failed:", err);
    });
  };

  setTimeout(run, INITIAL_DELAY_MS);
  setInterval(run, intervalMs());
}
