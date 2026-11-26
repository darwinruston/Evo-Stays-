"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// A thin bar across the top of the screen from the moment a link is tapped
// until the new page is there, so a slow connection never looks like a tap
// that missed. Works for another page and for the same page showing something
// else (a tab, a month, a filter), and in the installed app, which has no
// browser loading bar of its own.
//
// Links and search forms are noticed here. Code that moves the page itself
// (router.push) says so with startNavigation().
const EVENT = "evo:navigate";
// Never left running for ever if the page ends up where it started.
const GIVE_UP_MS = 20_000;

export function startNavigation(href: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: href }));
}

// Somewhere else on this site, as opposed to a file, another site, or a spot on
// the page already showing.
function leavesThisView(href: string): boolean {
  const to = new URL(href, window.location.href);
  if (to.origin !== window.location.origin || to.pathname.startsWith("/api/")) return false;
  return to.pathname !== window.location.pathname || to.search !== window.location.search;
}

export function NavigationProgress() {
  const here = `${usePathname()}?${useSearchParams()}`;
  // Where we were when the tap happened, while the next page is on its way.
  const [from, setFrom] = useState<string | null>(null);
  const [seen, setSeen] = useState(here);

  // The address has changed: whatever was wanted has arrived.
  if (seen !== here) {
    setSeen(here);
    setFrom(null);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // A modified click opens somewhere else and leaves this page as it is.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      if (leavesThisView(link.href)) setFrom(here);
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      // Only the search and filter forms, which load a page. The rest show it on
      // their own button.
      if (form.getAttribute("method")?.toLowerCase() !== "post" && !event.defaultPrevented) setFrom(here);
    }
    function onNavigate(event: Event) {
      if (leavesThisView((event as CustomEvent<string>).detail)) setFrom(here);
    }
    // Links are caught on the way down, before Next takes the click over.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener(EVENT, onNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener(EVENT, onNavigate);
    };
  }, [here]);

  useEffect(() => {
    if (from === null) return;
    const timer = setTimeout(() => setFrom(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [from]);

  if (from !== here) return null;

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div className="navigation-progress h-full bg-teal-300" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
