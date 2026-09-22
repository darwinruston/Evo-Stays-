// Next's sanctioned "run code once at server startup" hook -- see
// src/lib/syncScheduler.ts for why this app needs one. Guarded against
// double-registration since `register()` running twice in the same process
// would otherwise mean two overlapping timers.
let started = false;

export async function register() {
  if (started) return;
  started = true;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSyncScheduler } = await import("@/lib/syncScheduler");
    startSyncScheduler();
  }
}
