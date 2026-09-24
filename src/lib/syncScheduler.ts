import { runAllSyncs } from "@/lib/runAllSyncs";
import { checkAtRiskTurnovers } from "@/lib/turnover";

const DEFAULT_INTERVAL_MINUTES = 30;
// Far shorter than the sync interval: this one is a cheap local query, and
// an "at risk" alert that lands half an hour late has lost most of its
// point. See checkAtRiskTurnovers in src/lib/turnover.ts.
const TURNOVER_CHECK_INTERVAL_MS = 10 * 60_000;
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

  const checkTurnovers = () => {
    checkAtRiskTurnovers().catch((err) => {
      console.error("[turnover check] run failed:", err);
    });
  };
  setTimeout(checkTurnovers, INITIAL_DELAY_MS);
  setInterval(checkTurnovers, TURNOVER_CHECK_INTERVAL_MS);
}
