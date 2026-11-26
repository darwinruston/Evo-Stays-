import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatTimeOfDay } from "@/lib/arrival";
import { CLEAN_STATUS_LABELS, CLEAN_STATUS_TONES } from "@/lib/cleans";
import { MONTH_LABELS, WEEKDAY_LABELS, monthParam, parseMonth } from "@/lib/calendarMonth";
import { buildMonthGrid, calendarDayKey, isDateOnly, toIsoDate } from "@/lib/schedule";
import { badge, button, card } from "@/lib/ui";
import { currentRegion } from "@/lib/region";
import { InfoTooltip } from "@/components/InfoTooltip";

export const metadata = { title: "Calendar" };

// How many cleans a day's box names before it just counts the rest.
const NAMED_PER_DAY = 3;

function timeOf(date: Date): string {
  return isDateOnly(date) ? "" : formatTimeOfDay(date);
}

// Everyone's month in one place: what is booked on each day, who has said they
// cannot work, and where the two collide.
export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { db } = await requireStaff();
  const { month: rawMonth, day: rawDay } = await searchParams;
  const { year, monthIndex0 } = parseMonth(rawMonth);
  const month = monthParam(year, monthIndex0);

  const grid = buildMonthGrid(year, monthIndex0);
  // A day either side: a clean with a date but no time is stored as midnight
  // UTC, which can fall just outside the local span (see calendarDayKey).
  const from = new Date(grid[0].date);
  from.setDate(from.getDate() - 1);
  const to = new Date(grid[41].date);
  to.setDate(to.getDate() + 2);

  const todayIso = toIsoDate(new Date());
  // Today where this month holds it, otherwise the month's first day.
  const selectedIso =
    rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay : todayIso.startsWith(month) ? todayIso : `${month}-01`;

  const [cleans, unavailable] = await Promise.all([
    db.clean.findMany({
      where: { scheduledFor: { gte: from, lt: to } },
      select: {
        id: true,
        status: true,
        scheduledFor: true,
        assignedToId: true,
        assignedTo: { select: { name: true } },
        property: { select: { nickname: true, name: true, address: true } },
      },
      orderBy: { scheduledFor: "asc" },
    }),
    db.cleanerUnavailability.findMany({
      where: { date: { gte: from, lt: to } },
      select: { cleanerId: true, date: true, cleaner: { select: { name: true } } },
      orderBy: { cleaner: { name: "asc" } },
    }),
  ]);

  const offByDay = new Map<string, { id: string; name: string }[]>();
  for (const u of unavailable) {
    const iso = toIsoDate(u.date);
    offByDay.set(iso, [...(offByDay.get(iso) ?? []), { id: u.cleanerId, name: u.cleaner.name }]);
  }

  type Row = (typeof cleans)[number];
  const byDay = new Map<string, Row[]>();
  for (const c of cleans) {
    const iso = calendarDayKey(c.scheduledFor!);
    byDay.set(iso, [...(byDay.get(iso) ?? []), c]);
  }

  // Still to be done, by someone who has since said they cannot work that day,
  // or by nobody yet.
  const clashes = (c: Row, iso: string) =>
    c.status === "PENDING" && !!c.assignedToId && (offByDay.get(iso) ?? []).some((o) => o.id === c.assignedToId);
  const needsCleaner = (c: Row) => c.status === "PENDING" && !c.assignedToId;

  const clashDays = grid.filter(
    (d) => d.inCurrentMonth && d.iso >= todayIso && (byDay.get(d.iso) ?? []).some((c) => clashes(c, d.iso)),
  );

  const selected = byDay.get(selectedIso) ?? [];
  const selectedOff = offByDay.get(selectedIso) ?? [];
  const [y, m, d] = selectedIso.split("-").map(Number);
  const selectedLabel =
    (selectedIso === todayIso ? "Today, " : "") +
    new Date(y, m - 1, d).toLocaleDateString(currentRegion().locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const prev = new Date(year, monthIndex0 - 1, 1);
  const next = new Date(year, monthIndex0 + 1, 1);
  const monthHref = (date: Date) => `/admin/cleans/calendar?month=${monthParam(date.getFullYear(), date.getMonth())}`;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Calendar
          <InfoTooltip text="Every clean by day, with the days cleaners have marked themselves unavailable. Cleaners set those from their own calendar. Pick a day to see it in full." />
        </h1>
        <div className="flex items-center gap-2">
          <Link href={monthHref(prev)} className={button("secondary", "sm")} aria-label="Previous month">
            ←
          </Link>
          <span className="min-w-36 text-center text-sm font-medium">
            {MONTH_LABELS[monthIndex0]} {year}
          </span>
          <Link href={monthHref(next)} className={button("secondary", "sm")} aria-label="Next month">
            →
          </Link>
          <Link href="/admin/cleans/calendar" className={button("ghost", "sm")}>
            Today
          </Link>
        </div>
      </div>

      {clashDays.length > 0 && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          A clean is booked with someone who is unavailable on{" "}
          {clashDays.map((day, i) => (
            <span key={day.iso}>
              {i > 0 && ", "}
              <Link
                href={`/admin/cleans/calendar?month=${month}&day=${day.iso}`}
                scroll={false}
                className="font-medium underline underline-offset-2"
              >
                {day.date.toLocaleDateString(currentRegion().locale, { day: "numeric", month: "short" })}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ date, iso, inCurrentMonth }) => {
            const live = (byDay.get(iso) ?? []).filter((c) => c.status !== "CANCELLED");
            const off = offByDay.get(iso) ?? [];
            const problem = live.some((c) => clashes(c, iso));
            const unfilled = live.some(needsCleaner);
            const isSelected = iso === selectedIso;
            const summary = [
              `${live.length} ${live.length === 1 ? "clean" : "cleans"}`,
              off.length > 0 ? `unavailable: ${off.map((o) => o.name).join(", ")}` : "",
              problem ? "a booked cleaner is unavailable" : "",
              unfilled ? "a clean needs a cleaner" : "",
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <Link
                key={iso}
                href={`/admin/cleans/calendar?month=${month}&day=${iso}`}
                scroll={false}
                aria-label={`${date.getDate()} ${MONTH_LABELS[date.getMonth()]}: ${summary}`}
                aria-current={isSelected ? "date" : undefined}
                className={
                  "flex min-h-16 min-w-0 flex-col gap-1 rounded-lg border bg-surface p-1 text-left transition-colors sm:min-h-28 sm:p-1.5 " +
                  (isSelected
                    ? "border-teal-700 ring-2 ring-teal-700"
                    : problem
                      ? "border-rose-300"
                      : "border-black/[0.06] hover:border-teal-600/40") +
                  (inCurrentMonth ? "" : " opacity-40")
                }
              >
                <span
                  className={
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs " +
                    (iso === todayIso ? "bg-teal-700 font-medium text-white" : "text-zinc-600")
                  }
                >
                  {date.getDate()}
                </span>

                {/* A phone has room for counts only. */}
                <span className="flex flex-col gap-0.5 sm:hidden">
                  {live.length > 0 && (
                    <span
                      className={`rounded px-1 text-center text-[11px] ${
                        problem
                          ? "bg-rose-100 text-rose-800"
                          : unfilled
                            ? "bg-amber-100 text-amber-900"
                            : "bg-teal-50 text-teal-900"
                      }`}
                    >
                      {live.length}
                    </span>
                  )}
                  {off.length > 0 && (
                    <span className="rounded bg-zinc-200 px-1 text-center text-[11px] text-zinc-700">
                      {off.length} off
                    </span>
                  )}
                </span>

                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {live.slice(0, NAMED_PER_DAY).map((c) => (
                    <span
                      key={c.id}
                      className={`truncate rounded px-1 text-[11px] leading-4 ${
                        clashes(c, iso)
                          ? "bg-rose-100 text-rose-800"
                          : needsCleaner(c)
                            ? "bg-amber-100 text-amber-900"
                            : c.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-teal-50 text-teal-900"
                      }`}
                    >
                      {timeOf(c.scheduledFor!)} {propertyDisplayName(c.property)}
                    </span>
                  ))}
                  {live.length > NAMED_PER_DAY && (
                    <span className="px-1 text-[11px] text-zinc-500">+{live.length - NAMED_PER_DAY} more</span>
                  )}
                  {off.length > 0 && (
                    <span className="truncate rounded bg-zinc-200 px-1 text-[11px] leading-4 text-zinc-700">
                      Off: {off.map((o) => o.name).join(", ")}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <Key colour="bg-teal-100" label="Booked" />
          <Key colour="bg-amber-200" label="Needs a cleaner" />
          <Key colour="bg-emerald-200" label="Done" />
          <Key colour="bg-zinc-300" label="Unavailable" />
          <Key colour="bg-rose-300" label="Booked but unavailable" />
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{selectedLabel}</h2>

        {selectedOff.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-600">Unavailable:</span>
            {selectedOff.map((o) => (
              <Link key={o.id} href={`/admin/cleaners/${o.id}`} className={badge("neutral")}>
                {o.name}
              </Link>
            ))}
          </div>
        )}

        {selected.length === 0 ? (
          <p className="text-sm text-zinc-600">No cleans on this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selected.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/cleans/${c.id}?from=calendar&month=${month}&day=${selectedIso}`}
                  className={card("flex items-center justify-between gap-3 p-3.5")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{propertyDisplayName(c.property)}</span>
                    <span className="block text-sm text-zinc-600">
                      {timeOf(c.scheduledFor!) || "Any time"} · {c.assignedTo?.name ?? "Unassigned"}
                    </span>
                    {clashes(c, selectedIso) && (
                      <span className="block text-sm text-rose-700">
                        {c.assignedTo?.name} is unavailable this day. Open it to give it to someone else.
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 ${badge(needsCleaner(c) ? "warning" : CLEAN_STATUS_TONES[c.status])}`}>
                    {needsCleaner(c) ? "Needs a cleaner" : CLEAN_STATUS_LABELS[c.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href="/admin/cleans/new" className={`w-fit ${button("secondary", "sm")}`}>
          Schedule a clean
        </Link>
      </section>
    </div>
  );
}

function Key({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${colour}`} />
      {label}
    </span>
  );
}
