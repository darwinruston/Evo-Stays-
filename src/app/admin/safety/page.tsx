import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { formatDateOnly } from "@/lib/dateOnly";
import { safetyStatusLabel } from "@/lib/safetyChecks";
import { loadSafetyAttention, loadSafetyRest, type SafetyAttentionRow } from "@/lib/safetyOverview";
import { badge, card } from "@/lib/ui";
import { InfoTooltip } from "@/components/InfoTooltip";

export const metadata = { title: "Health & safety" };

// Everything across every property that is overdue or coming up, in one place,
// so nothing has to be hunted for property by property. Recording a date (or
// uploading the certificate) is done on the property's own Health & safety
// tab, one click away from each row.
export default async function SafetyOverviewPage() {
  const { db } = await requireStaff();

  const attention = await loadSafetyAttention(db);
  const [rest, openTasks] = await Promise.all([
    loadSafetyRest(db),
    attention.length === 0
      ? []
      : db.task.findMany({
          where: { safetyCheckId: { in: attention.map((a) => a.checkId) }, status: { not: "DONE" } },
          select: { safetyCheckId: true },
        }),
  ]);
  const hasTask = new Set(openTasks.map((t) => t.safetyCheckId));

  const overdue = attention.filter((a) => a.state === "overdue");
  const comingUp = attention.filter((a) => a.state === "due-soon");

  // Not recorded, grouped by property for a short quiet list.
  const byProperty = new Map<string, { name: string; titles: string[] }>();
  for (const row of rest.notRecorded) {
    const group = byProperty.get(row.propertyId) ?? { name: row.propertyName, titles: [] };
    group.titles.push(row.title);
    byProperty.set(row.propertyId, group);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Health &amp; safety
            <InfoTooltip text="Every check across your properties that is overdue or coming up, so you can stay on top of them in one place. Open one to record the new date and keep the certificate. Reminders start once a date is recorded, so a check with no date yet is listed at the bottom but never counted as an alarm." />
          </h1>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className={badge(overdue.length > 0 ? "solid" : "neutral")}>{overdue.length} overdue</li>
          <li className={badge(comingUp.length > 0 ? "outline" : "neutral")}>{comingUp.length} coming up</li>
          <li className={badge("neutral")}>{rest.upToDate} up to date</li>
        </ul>
      </div>

      {attention.length === 0 ? (
        <div className={card("px-6 py-12 text-center ring-1 ring-black/[0.04]")}>
          <p className="font-medium">Nothing needs attention.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Every check with a date recorded is up to date. You will be reminded here and by notification before the next
            one is due.
          </p>
        </div>
      ) : (
        <>
          <Group title="Overdue" rows={overdue} hasTask={hasTask} />
          <Group title="Coming up" rows={comingUp} hasTask={hasTask} />
        </>
      )}

      {byProperty.size > 0 && (
        <details className="max-w-3xl">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900">
            {rest.notRecorded.length} {rest.notRecorded.length === 1 ? "check has" : "checks have"} no date recorded yet
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {[...byProperty.entries()].map(([propertyId, group]) => (
              <li key={propertyId}>
                <Link href={`/admin/properties/${propertyId}?tab=safety`} className="font-medium underline underline-offset-2">
                  {group.name}
                </Link>
                <span className="text-zinc-500">: {group.titles.join(", ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Group({ title, rows, hasTask }: { title: string; rows: SafetyAttentionRow[]; hasTask: Set<string | null> }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {title} ({rows.length})
      </h2>
      <div className={card("overflow-hidden ring-1 ring-black/[0.04]")}>
        <ul className="divide-y divide-black/5">
          {rows.map((row) => (
            <li key={row.checkId}>
              <Link
                href={`/admin/properties/${row.propertyId}?tab=safety`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-black/[0.025] md:grid-cols-[minmax(0,1fr)_9rem_11rem_1rem]"
              >
                <div className="min-w-0">
                  <p className="font-medium [overflow-wrap:anywhere]">{row.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
                    <span>{row.propertyName}</span>
                    {row.lastCompletedOn && <span>Last done {formatDateOnly(row.lastCompletedOn)}</span>}
                    {hasTask.has(row.checkId) && <span>On the team&apos;s task list</span>}
                  </p>
                </div>
                <span className="justify-self-end text-sm text-zinc-700 md:justify-self-start">
                  <span className="text-zinc-500">Due </span>
                  {formatDateOnly(row.dueOn)}
                </span>
                <span className="col-span-2 md:col-span-1">
                  <span className={badge(row.state === "overdue" ? "solid" : "outline")}>
                    {safetyStatusLabel(row.state, row.days)}
                  </span>
                </span>
                <span aria-hidden="true" className="hidden text-zinc-400 md:block">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
