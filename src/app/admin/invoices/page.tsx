import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency, formatHours, formatPeriod, defaultPeriodForCadence } from "@/lib/invoices";
import { toIsoDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { updateBillingCadence, runInvoiceGeneration } from "./actions";

export const metadata = { title: "Invoices" };

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; skipped?: string }>;
}) {
  await requireStaff();
  const { created, skipped } = await searchParams;

  const settings = await prisma.billingSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const { start, end } = defaultPeriodForCadence(settings.cadence);
  // The "To" field shows the last *included* day. end is the exclusive
  // boundary generateInvoices uses internally -- subtract a day so the
  // picker doesn't show a date that's actually outside the period.
  const lastIncludedDay = new Date(end);
  lastIncludedDay.setDate(lastIncludedDay.getDate() - 1);

  const invoices = await prisma.invoice.findMany({
    orderBy: { periodStart: "desc" },
    include: {
      cleaner: { select: { name: true } },
      property: { select: { name: true, address: true, client: { select: { name: true } } } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One invoice per cleaner per property, built from check-in/check-out times.
        </p>
      </div>

      {created !== undefined && (
        <div className={card("p-4 text-sm")}>
          <p>
            {created === "0"
              ? "No new invoices — nothing unbilled in that period."
              : `Generated ${created} ${created === "1" ? "invoice" : "invoices"}.`}
          </p>
          {skipped && (
            <p className="mt-1 text-zinc-600">
              Skipped (no hourly rate set): {skipped}. Set a rate on their cleaner page and
              generate again — already-billed visits won&apos;t be duplicated.
            </p>
          )}
        </div>
      )}

      <section className={card("flex flex-col gap-4 p-4")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form action={updateBillingCadence} className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="cadence" className="text-xs text-zinc-500">
                Invoice cadence
              </label>
              <select
                id="cadence"
                name="cadence"
                defaultValue={settings.cadence}
                className={inputCompact}
              >
                {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={button("secondary", "sm")}>
              Save
            </button>
          </form>
        </div>

        <form action={runInvoiceGeneration} className="flex flex-wrap items-end gap-3 border-t border-black/5 pt-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="periodStart" className="text-xs text-zinc-500">
              From
            </label>
            <input
              id="periodStart"
              name="periodStart"
              type="date"
              defaultValue={toIsoDate(start)}
              required
              className={inputCompact}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="periodEnd" className="text-xs text-zinc-500">
              To
            </label>
            <input
              id="periodEnd"
              name="periodEnd"
              type="date"
              defaultValue={toIsoDate(lastIncludedDay)}
              required
              className={inputCompact}
            />
          </div>
          <button type="submit" className={button("primary", "sm")}>
            Generate invoices
          </button>
          <p className="w-full text-xs text-zinc-500">
            Both dates are included in full. Only picks up completed cleans not already on an
            invoice — safe to run again over an overlapping period.
          </p>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Generated ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-600">No invoices generated yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className={card("flex items-center justify-between gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{inv.cleaner.name}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {propertyDisplayName(inv.property)} · {inv.property.client.name} ·{" "}
                      {formatPeriod(inv.periodStart, inv.periodEnd)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      {formatHours(inv.totalHours)} · {formatCurrency(inv.totalAmount)}
                    </span>
                    <span className={badge(inv.paidAt ? "solid" : "neutral")}>
                      {inv.paidAt ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
