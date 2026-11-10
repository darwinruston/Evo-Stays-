"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type SectionTab = {
  href: string;
  label: string;
  // A shorter name for a narrow screen, where four tabs have to fit one row.
  shortLabel?: string;
  // A badge after the label (open issues, your tasks). Zero shows nothing.
  count?: number;
  countLabel?: string;
  // Also current on pages below it (a task's own page keeps the Tasks tab).
  deep?: boolean;
};

export type Section = { key: string; tabs: SectionTab[] };

function isCurrent(tab: SectionTab, pathname: string): boolean {
  return pathname === tab.href || (tab.deep === true && pathname.startsWith(`${tab.href}/`));
}

// The tabs under the main menu for the section you are in: Cleaning shows
// Cleans, Stock and Laundry; Team shows People, Tasks and Activity. They show
// on a section's own pages and not on the pages below them (one clean, one
// property), which carry their own links back and, for a property, their own
// tabs. A section with a single page shows no tabs at all.
export function SectionTabs({ sections }: { sections: Section[] }) {
  const pathname = usePathname();
  const section = sections.find((s) => s.tabs.some((t) => isCurrent(t, pathname)));
  const currentRef = useRef<HTMLAnchorElement>(null);

  // On a phone the row can be wider than the screen: bring the tab you are on
  // into view. Only sideways (inline), so the page itself never jumps.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  if (!section || section.tabs.length < 2) return null;

  return (
    // The line under the tabs is on the nav, and the list sits one pixel over
    // it, so the current tab's underline covers the line. The list scrolls
    // sideways when the tabs do not all fit.
    <nav aria-label="Section" className="mb-6 border-b border-black/10">
      <ul className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {section.tabs.map((tab) => {
          const current = isCurrent(tab, pathname);
          const count = tab.count ?? 0;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                ref={current ? currentRef : undefined}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3 ${
                  current ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.shortLabel ? (
                  <>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </>
                ) : (
                  tab.label
                )}
                {count > 0 && (
                  <span className="rounded-full bg-zinc-900 px-1.5 text-xs leading-5 text-white">
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> {tab.countLabel ?? "new"}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
