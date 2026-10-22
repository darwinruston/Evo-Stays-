"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) on every page, so alerts can
// arrive and the offline page can be shown. Renders nothing. A browser that
// doesn't support service workers just carries on without one.
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works the same, just without alerts or the offline page.
    });
  }, []);
  return null;
}
