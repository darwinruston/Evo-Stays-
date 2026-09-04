import Link from "next/link";
import type { CleanStatus } from "@prisma/client";
import { CLEAN_STATUS_LABELS, isCleanFinished } from "@/lib/cleans";
import { formatScheduledFor, groupCleansByTime } from "@/lib/schedule";
import { card } from "@/lib/ui";
import { CleanPrepSummary } from "@/components/CleanPrepSummary";
import type { CleanPrep } from "@/lib/cleanPrep";

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
  // Omitted entirely for a cancelled/completed clean by most callers --
  // there's nothing left to prep for those.
  prep?: CleanPrep | null;
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
      {groups.map(({ group, cleans: rows }) => {
        const list = (
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
                    {c.prep && <CleanPrepSummary prep={c.prep} className="mt-0.5 text-xs" />}
                  </div>
                  <span className="shrink-0 text-sm text-zinc-500">
                    {CLEAN_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        );

        // Past cleans just accumulate forever -- collapsed by default so
        // the list reads as what's coming up, not a growing history, but
        // still one click away when someone actually needs it.
        if (group === "Past") {
          return (
            <details key={group}>
              <summary className="cursor-pointer text-sm font-medium text-zinc-500">
                Past ({rows.length})
              </summary>
              <div className="mt-2">{list}</div>
            </details>
          );
        }

        return (
          <div key={group} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-500">{group}</h2>
            {list}
          </div>
        );
      })}
    </div>
  );
}
