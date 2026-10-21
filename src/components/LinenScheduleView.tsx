import Link from "next/link";
import { formatClock, type LinenDay } from "@/lib/linenPlan";
import { formatMinutes } from "@/lib/cleanDuration";
import { toIsoDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { LinenStopControls } from "@/components/LinenStopControls";
import { setLinenArrival, clearLinenArrival, flagLinenIssue } from "@/app/linen/actions";
import { resolveLinenIssue } from "@/app/admin/laundry/actions";

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayHeading(day: Date): string {
  return day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function rangeLabel(from: Date, to: Date): string {
  const sameMonth = from.getMonth() === to.getMonth();
  const start = from.toLocaleDateString("en-GB", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  const end = to.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${start} to ${end}`;
}

function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// A week of a linen company's delivery plan, one section per day that has
// anything to do. Each property shows just two things: the estimated clean
// time, and when the clean linen should be there. Shared by the linen
// company's own page ("linen": it can pick its arrival time and flag a
// problem) and the staff view of the same plan ("staff": it also shows the
// cleaner, what the linen company chose and any problem flagged, with a way
// to resolve it).
export function LinenScheduleView({
  days,
  facilityName,
  from,
  mode,
  hrefForFrom,
  hrefForClean,
}: {
  days: LinenDay[];
  facilityName: string;
  from: Date;
  mode: "linen" | "staff";
  hrefForFrom: (isoDate: string) => string;
  hrefForClean?: (cleanId: string) => string;
}) {
  const todayIso = toIsoDate(new Date());
  const to = addDays(from, days.length > 0 ? days.length - 1 : 6);
  const busy = days.filter((d) => d.plan.stops.length > 0 || d.plan.untimed.length > 0);
  const notes = mode === "staff" ? [...new Set(days.flatMap((d) => d.notes))] : [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-zinc-500">{facilityName}</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{rangeLabel(from, to)}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={hrefForFrom(toIsoDate(addDays(from, -7)))} className={button("secondary", "sm")}>
            ← Previous week
          </Link>
          {toIsoDate(from) !== todayIso && (
            <Link href={hrefForFrom(todayIso)} className={button("secondary", "sm")}>
              Today
            </Link>
          )}
          <Link href={hrefForFrom(toIsoDate(addDays(from, 7)))} className={button("secondary", "sm")}>
            Next week →
          </Link>
        </div>
      </div>

      {busy.length === 0 && <p className="text-sm text-zinc-600">No linen to deliver or collect in these days.</p>}

      {busy.map((data) => {
        const dayIso = toIsoDate(data.day);
        return (
          <section key={dayIso} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              {dayHeading(data.day)}
              {dayIso === todayIso && <span className={badge("solid")}>Today</span>}
            </h2>

            <ol className="flex flex-col gap-3">
              {data.plan.stops.map((stop) => {
                const visit = data.visits[stop.cleanId];
                return (
                  <li key={stop.cleanId} className={card("flex flex-col gap-3 p-4")}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{stop.name}</p>
                        <a
                          href={mapsHref(stop.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                        >
                          {stop.address}
                        </a>
                        <p className="mt-1.5 text-sm text-zinc-600">
                          Estimated clean time: {formatMinutes(stop.cleanMinutes)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-zinc-500">Clean linen there</p>
                        {stop.chosen === "set" ? (
                          <p className="text-xl font-semibold tracking-tight">at {formatClock(stop.plannedArrival)}</p>
                        ) : (
                          <p className="text-xl font-semibold tracking-tight">
                            {formatClock(stop.plannedArrival)}
                            {stop.latestArrival.getTime() > stop.plannedArrival.getTime()
                              ? ` to ${formatClock(stop.latestArrival)}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {mode === "staff" && (
                      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                        {stop.cleanerName ?? "Cleaner"} arrives {formatClock(stop.cleanerArrival!)}
                        <span className={badge(stop.arrivalConfirmed ? "neutral" : "outline")}>
                          {stop.arrivalConfirmed ? "Confirmed" : "Not confirmed"}
                        </span>
                        {stop.tight && <span className={badge("outline")}>Short clean</span>}
                      </p>
                    )}

                    {stop.lateByMinutes > 0 && (
                      <p role="alert" className={`${badge("solid")} w-fit`}>
                        {stop.chosen === "set"
                          ? `Can't get here by the time chosen: earliest ${formatClock(stop.plannedArrival)}`
                          : `Can't be here before ${formatClock(stop.plannedArrival)}, ${stop.lateByMinutes} min too late`}
                      </p>
                    )}

                    {mode === "linen" && (
                      <LinenStopControls
                        windowStart={formatClock(stop.windowStart)}
                        windowEnd={formatClock(stop.windowEnd)}
                        suggested={formatClock(stop.plannedArrival)}
                        chosen={stop.chosen === "set" ? formatClock(stop.plannedArrival) : null}
                        stale={stop.chosen === "stale"}
                        issue={
                          visit?.issueNote
                            ? {
                                note: visit.issueNote,
                                resolved: visit.issueResolvedAt !== null,
                                resolutionNote: visit.resolutionNote,
                              }
                            : null
                        }
                        setArrival={setLinenArrival.bind(null, stop.cleanId, dayIso)}
                        clearArrival={clearLinenArrival.bind(null, stop.cleanId, dayIso)}
                        flagIssue={flagLinenIssue.bind(null, stop.cleanId, dayIso)}
                      />
                    )}

                    {mode === "staff" && stop.chosen === "stale" && (
                      <p className="text-xs text-zinc-500">
                        The linen company chose a time that no longer fits (the cleaner&apos;s time changed), so the
                        suggested time is shown until they choose again.
                      </p>
                    )}

                    {mode === "staff" && visit?.issueNote && (
                      <div className="flex flex-col gap-2 rounded-lg bg-black/[0.04] p-3 text-sm">
                        <p className="flex items-center gap-2 font-medium">
                          Linen company problem
                          <span className={badge(visit.issueResolvedAt ? "neutral" : "solid")}>
                            {visit.issueResolvedAt ? "Resolved" : "Needs picking up"}
                          </span>
                        </p>
                        <p className="text-zinc-700">{visit.issueNote}</p>
                        {visit.issueResolvedAt ? (
                          visit.resolutionNote && <p className="text-zinc-600">You replied: {visit.resolutionNote}</p>
                        ) : (
                          <form
                            action={resolveLinenIssue.bind(null, stop.cleanId)}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              name="resolutionNote"
                              maxLength={300}
                              placeholder="Optional note back to them"
                              className={`${inputCompact} max-w-xs flex-1`}
                            />
                            <button type="submit" className={button("secondary", "sm")}>
                              Mark resolved
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {hrefForClean && mode === "staff" && (
                      <Link
                        href={hrefForClean(stop.cleanId)}
                        className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                      >
                        Open the clean
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>

            {data.plan.untimed.length > 0 && (
              <ul className="flex flex-col gap-2">
                {data.plan.untimed.map((stop) => (
                  <li key={stop.cleanId} className={card("p-4 text-sm")}>
                    <p className="font-medium">{stop.name}</p>
                    <p className="text-zinc-500">No arrival time yet, so it can&apos;t be planned.</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-zinc-500">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
