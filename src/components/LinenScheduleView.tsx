import Link from "next/link";
import { formatClock, type LinenDay } from "@/lib/linenPlan";
import { formatMinutes } from "@/lib/cleanDuration";
import { toIsoDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { LinenStopControls } from "@/components/LinenStopControls";
import { setLinenArrival, clearLinenArrival, flagLinenIssue } from "@/app/linen/actions";
import { resolveLinenIssue } from "@/app/admin/laundry/actions";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function heading(day: Date): string {
  return day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// One day of a linen company's delivery plan: the order to visit, the window
// to arrive within at each property (after the cleaner has got there, so
// there's dirty linen to take, and before the clean linen is too late to
// use), and when each cleaner arrives.
// Shared by the linen company's own page ("linen": it can pick its arrival
// time and flag a problem) and the staff view of the same plan ("staff": it
// shows what the linen company chose and any problem flagged, with a way to
// resolve it, and links on to the clean).
export function LinenScheduleView({
  data,
  mode,
  hrefForDay,
  hrefForClean,
}: {
  data: LinenDay;
  mode: "linen" | "staff";
  hrefForDay: (isoDate: string) => string;
  hrefForClean?: (cleanId: string) => string;
}) {
  const { plan, notes } = data;
  const today = new Date();
  const isToday = toIsoDate(data.day) === toIsoDate(today);
  const dayIso = toIsoDate(data.day);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-zinc-500">{data.facility.name}</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{heading(data.day)}</h1>
        <div className="mt-3 flex items-center gap-2">
          <Link href={hrefForDay(toIsoDate(addDays(data.day, -1)))} className={button("secondary", "sm")}>
            ← Previous
          </Link>
          {!isToday && (
            <Link href={hrefForDay(toIsoDate(today))} className={button("secondary", "sm")}>
              Today
            </Link>
          )}
          <Link href={hrefForDay(toIsoDate(addDays(data.day, 1)))} className={button("secondary", "sm")}>
            Next →
          </Link>
        </div>
      </div>

      {plan.stops.length > 0 && (
        <div className={card("flex flex-col gap-1 p-4")}>
          <p className="text-sm text-zinc-500">
            {plan.stops.length} {plan.stops.length === 1 ? "stop" : "stops"} · about {plan.totalDriveMinutes} min
            driving
          </p>
          {!plan.feasible && (
            <p role="alert" className="text-base font-medium">
              This day can&apos;t be fully made: the van can&apos;t reach every property while its clean linen is
              still useful. See the stops marked late.
            </p>
          )}
        </div>
      )}

      {plan.stops.length === 0 && plan.untimed.length === 0 && (
        <p className="text-sm text-zinc-600">No linen to deliver or collect on this day.</p>
      )}

      <ol className="flex flex-col gap-3">
        {plan.stops.map((stop) => (
          <li key={stop.cleanId} className={card("flex flex-col gap-3 p-4")}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white">
                {stop.order}
              </span>
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
              </div>
              <div className="shrink-0 text-right">
                {stop.chosen === "set" ? (
                  <>
                    <p className="text-xs text-zinc-500">{mode === "linen" ? "You're arriving at" : "Linen arriving at"}</p>
                    <p className="text-xl font-semibold tracking-tight">{formatClock(stop.plannedArrival)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500">Arrive between</p>
                    <p className="text-xl font-semibold tracking-tight">
                      {formatClock(stop.plannedArrival)}
                      {stop.latestArrival.getTime() > stop.plannedArrival.getTime()
                        ? ` to ${formatClock(stop.latestArrival)}`
                        : ""}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/5 pt-3 text-sm text-zinc-600">
              <span>
                {stop.cleanerName ?? "Cleaner"} arrives {formatClock(stop.cleanerArrival!)}
              </span>
              {stop.arrivalConfirmed ? (
                <span className={badge("neutral")}>Confirmed</span>
              ) : (
                <span className={badge("outline")}>Not confirmed</span>
              )}
              {stop.order > 1 && (
                <span className="text-zinc-400">
                  From the last stop: about {stop.driveFromPreviousMinutes} min
                  {stop.driveKnown ? "" : " (guess)"}
                </span>
              )}
            </div>
            <p className="-mt-1 text-xs text-zinc-500">
              The clean usually takes about {formatMinutes(stop.cleanMinutes)}
              {stop.cleanEstimateLearned
                ? ` (from ${stop.cleanEstimateSample} past cleans)`
                : stop.cleanEstimateSample > 0
                  ? ` (an early estimate, ${stop.cleanEstimateSample} past ${stop.cleanEstimateSample === 1 ? "clean" : "cleans"} so far)`
                  : " (a rough estimate, no past cleans yet)"}
              . Dirty linen is ready from {formatClock(stop.windowStart)} (about {formatMinutes(stop.handoverMinutes)} after the
              cleaner arrives), and clean linen needs to be here by{" "}
              {formatClock(stop.windowEnd)}, about {formatMinutes(stop.leadMinutes)} before the clean ends.
              {stop.tight ? " This is a short clean, so there's little time to have the dirty linen ready." : ""}
              {stop.waitMinutes > 0 ? ` The van waits about ${stop.waitMinutes} min here for that.` : ""}
            </p>

            {stop.lateByMinutes > 0 && (
              <p role="alert" className={`${badge("solid")} w-fit`}>
                {stop.chosen === "set"
                  ? `Can't get here by the time chosen: earliest ${formatClock(stop.plannedArrival)}, after the stop before`
                  : `Can't arrive before ${formatClock(stop.plannedArrival)}, ${stop.lateByMinutes} min after the clean linen is needed`}
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
                  data.visits[stop.cleanId]?.issueNote
                    ? {
                        note: data.visits[stop.cleanId].issueNote!,
                        resolved: data.visits[stop.cleanId].issueResolvedAt !== null,
                        resolutionNote: data.visits[stop.cleanId].resolutionNote,
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
                The linen company had chosen a time, but it no longer fits (the cleaner&apos;s time changed), so the
                suggested time is shown until they choose again.
              </p>
            )}

            {mode === "staff" && data.visits[stop.cleanId]?.issueNote && (
              <div className="flex flex-col gap-2 rounded-lg bg-black/[0.04] p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  Linen company problem
                  <span className={badge(data.visits[stop.cleanId].issueResolvedAt ? "neutral" : "solid")}>
                    {data.visits[stop.cleanId].issueResolvedAt ? "Resolved" : "Needs picking up"}
                  </span>
                </p>
                <p className="text-zinc-700">{data.visits[stop.cleanId].issueNote}</p>
                {data.visits[stop.cleanId].issueResolvedAt ? (
                  data.visits[stop.cleanId].resolutionNote && (
                    <p className="text-zinc-600">You replied: {data.visits[stop.cleanId].resolutionNote}</p>
                  )
                ) : (
                  <form action={resolveLinenIssue.bind(null, stop.cleanId)} className="flex flex-wrap items-center gap-2">
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

            {hrefForClean && (
              <Link
                href={hrefForClean(stop.cleanId)}
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
              >
                Open the clean
              </Link>
            )}
          </li>
        ))}
      </ol>

      {plan.untimed.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">No arrival time yet</h2>
          <ul className="flex flex-col gap-2">
            {plan.untimed.map((stop) => (
              <li key={stop.cleanId} className={card("p-4 text-sm")}>
                <p className="font-medium">{stop.name}</p>
                <p className="text-zinc-500">
                  {stop.address} · the clean is booked for this day but has no time yet, so it can&apos;t be planned.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

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
