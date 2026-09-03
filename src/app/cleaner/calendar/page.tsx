import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { buildMonthGrid, toIsoDate, formatScheduledFor } from "@/lib/schedule";
import { button } from "@/lib/ui";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseMonth(raw: string | undefined): { year: number; monthIndex0: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, monthIndex0: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex0: now.getMonth() };
}

function monthParam(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

export const metadata = { title: "Calendar" };

// The cleaner's own schedule -- a month grid to see the shape of the month at
// a glance, plus a day agenda below for the actual list. Only ever this
// signed-in cleaner's own cleans.
export default async function CleanerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const session = await requireCleaner();
  const { month: monthParamRaw, day: dayParamRaw } = await searchParams;
  const { year, monthIndex0 } = parseMonth(monthParamRaw);

  const grid = buildMonthGrid(year, monthIndex0);
  const gridStart = grid[0].date;
  const gridEnd = new Date(grid[41].date);
  gridEnd.setDate(gridEnd.getDate() + 1);

  const todayIso = toIsoDate(new Date());
  const selectedIso =
    dayParamRaw && /^\d{4}-\d{2}-\d{2}$/.test(dayParamRaw) ? dayParamRaw : todayIso;

  const cleans = await prisma.clean.findMany({
    where: {
      assignedToId: session.user.id,
      scheduledFor: { gte: gridStart, lt: gridEnd },
    },
    include: { property: { select: { name: true, address: true } } },
    orderBy: { scheduledFor: "asc" },
  });

  const byDay = new Map<string, typeof cleans>();
  for (const c of cleans) {
    const iso = toIsoDate(c.scheduledFor!);
    const list = byDay.get(iso) ?? [];
    list.push(c);
    byDay.set(iso, list);
  }
  const selected = byDay.get(selectedIso) ?? [];

  const [selYear, selMonth, selDay] = selectedIso.split("-").map(Number);
  const selectedDateLabel =
    selectedIso === todayIso
      ? "Today"
      : new Date(selYear, selMonth - 1, selDay).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

  const prevMonth = new Date(year, monthIndex0 - 1, 1);
  const nextMonth = new Date(year, monthIndex0 + 1, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/cleaner/calendar?month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}`}
          className={button("secondary", "sm")}
          aria-label="Previous month"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          {MONTH_LABELS[monthIndex0]} {year}
        </h1>
        <Link
          href={`/cleaner/calendar?month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}`}
          className={button("secondary", "sm")}
          aria-label="Next month"
        >
          →
        </Link>
      </div>

      <div>
        <div className="grid grid-cols-7 text-center text-xs text-zinc-500">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ date, iso, inCurrentMonth }) => {
            const dayCleans = byDay.get(iso) ?? [];
            const isToday = iso === todayIso;
            const isSelected = iso === selectedIso;
            return (
              <Link
                key={iso}
                href={`/cleaner/calendar?month=${monthParam(year, monthIndex0)}&day=${iso}`}
                className={
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-colors " +
                  (isSelected
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : isToday
                      ? "border-black/25 font-medium"
                      : "border-black/[0.06]") +
                  (inCurrentMonth ? "" : " opacity-30")
                }
              >
                <span>{date.getDate()}</span>
                {dayCleans.length > 0 && (
                  <span
                    className={"h-1.5 w-1.5 rounded-full " + (isSelected ? "bg-white" : "bg-zinc-900")}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">{selectedDateLabel}</h2>
        {selected.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing scheduled this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selected.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cleaner/cleans/${c.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-black/[0.06] bg-surface p-3.5 transition-colors hover:border-black/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{propertyDisplayName(c.property)}</span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {CLEAN_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600">
                    {formatScheduledFor(c.scheduledFor!)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
