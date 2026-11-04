"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTab = {
  href: string;
  label: string;
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
  if (!section || section.tabs.length < 2) return null;

  return (
    <nav aria-label="Section" className="mb-6">
      <ul className="flex gap-1 border-b border-black/10">
        {section.tabs.map((tab) => {
          const current = isCurrent(tab, pathname);
          const count = tab.count ?? 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  current ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
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
