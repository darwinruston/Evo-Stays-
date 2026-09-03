import Link from "next/link";
import type { CleanStatus } from "@prisma/client";
import { CLEAN_STATUS_LABELS, isCleanFinished } from "@/lib/cleans";
import { formatScheduledFor, groupCleansByTime } from "@/lib/schedule";
import { card } from "@/lib/ui";

// Pre-shaped so the admin, cleaner and client lists can share the grouping
// and row treatment without this component knowing about any of their
// queries. Each caller maps its own rows and decides what the subtitle says.
export type CleanRow = {
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
  status: CleanStatus;
  scheduledFor: Date | null;
};

export function CleanList({ cleans, empty }: { cleans: CleanRow[]; empty: string }) {
  if (cleans.length === 0) {
    return <p className="text-sm text-zinc-600">{empty}</p>;
  }

  const groups = groupCleansByTime(
    cleans,
    (c) => c.scheduledFor,
    (c) => isCleanFinished(c.status),
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ group, cleans: rows }) => (
        <div key={group} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">{group}</h2>
          <ul className="flex flex-col gap-2">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={c.href}
                  className={card("flex items-center justify-between gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{c.title}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {c.scheduledFor ? formatScheduledFor(c.scheduledFor) : "Not scheduled"}
                      {c.subtitle ? ` · ${c.subtitle}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-zinc-500">
                    {CLEAN_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
