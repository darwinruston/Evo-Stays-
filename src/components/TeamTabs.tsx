"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// People and Tasks, the two halves of the Team area. Styled like the property
// page's tabs so it reads as the same kind of control.
export function TeamTabs({ openTasks }: { openTasks: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/team", label: "People", active: pathname === "/admin/team", count: 0 },
    { href: "/admin/team/tasks", label: "Tasks", active: pathname.startsWith("/admin/team/tasks"), count: openTasks },
  ];
  return (
    <nav aria-label="Team sections">
      <ul className="flex gap-1 border-b border-black/10">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                t.active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="rounded-full bg-zinc-900 px-1.5 text-xs leading-5 text-white">
                  {t.count}
                  <span className="sr-only"> of your tasks to do</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
