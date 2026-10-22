"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// A thin notice at the top of every page while the phone has no connection,
// so a button that "does nothing" is understood: it can't reach the server.
// Hidden during the server render and until the browser reports otherwise.
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-zinc-900 px-4 py-2 text-center text-sm text-white">
      You&apos;re offline. Changes won&apos;t save until your signal is back.
    </div>
  );
}
