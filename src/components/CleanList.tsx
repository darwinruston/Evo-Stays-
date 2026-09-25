import Link from "next/link";
import type { CleanStatus } from "@prisma/client";
import { CLEAN_STATUS_LABELS, isCleanFinished } from "@/lib/cleans";
import { calendarDayKey, formatScheduledFor, groupCleansByTime } from "@/lib/schedule";
import { badge, card } from "@/lib/ui";
import { CleanPrepSummary } from "@/components/CleanPrepSummary";
import type { CleanPrep } from "@/lib/cleanPrep";
import { turnoverLabel, turnoverPriority, type Turnover } from "@/lib/turnover";

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
  // What's known about the next guests (see turnoversFor in
  // src/lib/turnover.ts) -- omitted for finished cleans, same as prep. Drives
  // the same-day label and the ordering within each day.
  turnover?: Turnover | null;
  // Set when the assigned cleaner has more than one clean on this same day
  // (see sameDayCounts in src/lib/cleans.ts) -- staff-facing, so a double
  // booking is seen before anyone's told to do two places at once.
  clash?: string | null;
};

function CleanRows({ rows }: { rows: CleanRow[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((c) => {
        const label = c.turnover && c.scheduledFor ? turnoverLabel(c.turnover, c.scheduledFor) : null;
        return (
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
                {c.clash && <span className={`mt-1.5 mr-1.5 ${badge("outline")}`}>{c.clash}</span>}
                {label &&
                  (label.urgent ? (
                    <span className={`mt-1.5 ${badge("solid")}`}>{label.text}</span>
                  ) : (
                    <p className="mt-0.5 text-xs text-zinc-500">{label.text}</p>
                  ))}
              </div>
              <span className="shrink-0 text-sm text-zinc-500">{CLEAN_STATUS_LABELS[c.status]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CleanList({
  cleans,
  empty,
  flat,
}: {
  cleans: CleanRow[];
  empty: string;
  // Skips the time-bucketing (and the "Past" collapse) for a flat
  // chronological list instead -- for when the caller already narrowed the
  // set on purpose (e.g. filtered to a specific status or property), where
  // burying most of the results behind a collapsed "Past" disclosure would
  // work against the filter rather than for it.
  flat?: boolean;
}) {
  if (cleans.length === 0) {
    return <p className="text-sm text-zinc-600">{empty}</p>;
  }

  if (flat) {
    return <CleanRows rows={cleans} />;
  }

  const groups = groupCleansByTime(
    cleans,
    (c) => c.scheduledFor,
    (c) => isCleanFinished(c.status),
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ group, cleans: rows }) => {
        // Overdue stays at the top -- it's the one bucket that means
        // something is late -- but as a slim collapsed bar with its count, so
        // Today and Tomorrow are what the eye lands on first, and the late
        // ones are one tap away rather than gone.
        if (group === "Overdue") {
          return (
            <details key={group} className="group rounded-lg border border-black/10 bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
                <span>
                  Overdue <span className="font-normal text-zinc-500">({rows.length})</span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
                </svg>
              </summary>
              <div className="border-t border-black/5 p-2">
                <CleanRows rows={rows} />
              </div>
            </details>
          );
        }

        // Past cleans just accumulate forever -- collapsed by default so
        // the list reads as what's coming up, not a growing history, but
        // still one click away when someone actually needs it.
        if (group === "Past") {
          return (
            <details key={group}>
              <summary className="cursor-pointer text-sm font-medium text-zinc-500">
                Past ({rows.length})
              </summary>
              <div className="mt-2">
                <CleanRows rows={rows} />
              </div>
            </details>
          );
        }

        // Within a single day, a same-day turnover (next guests arriving that
        // same day) jumps the queue, soonest deadline first -- a 10am clean
        // with nobody due until next week can wait behind a noon one with
        // guests at 3pm. Days themselves stay in date order: multi-day
        // groups ("This week", "Later") mustn't pull a Sunday turnover above
        // Thursday's cleans. Array.sort is stable, so everything else keeps
        // its chronological order.
        const ordered = [...rows].sort((a, b) => {
          const dayA = a.scheduledFor ? calendarDayKey(a.scheduledFor) : "";
          const dayB = b.scheduledFor ? calendarDayKey(b.scheduledFor) : "";
          if (dayA !== dayB) return dayA < dayB ? -1 : 1;
          return turnoverPriority(a.turnover) - turnoverPriority(b.turnover);
        });

        return (
          <div key={group} className="flex flex-col gap-2">
            {/* Bolder + darker than the "None" placeholder below it, and
                than the row text within -- otherwise an empty section reads
                as one flat block of same-weight grey, and the heading stops
                looking like a heading. */}
            <h2 className="text-sm font-semibold text-zinc-900">{group}</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">None</p>
            ) : (
              <CleanRows rows={ordered} />
            )}
          </div>
        );
      })}
    </div>
  );
}
