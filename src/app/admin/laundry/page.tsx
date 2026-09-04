import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency } from "@/lib/invoices";
import { toIsoDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { createLaundryLoad } from "./actions";

export const metadata = { title: "Laundry" };

export default async function LaundryPage() {
  await requireStaff();

  // Same "real completed visit, not already claimed" filter
  // createLaundryLoad re-validates server-side -- see src/app/admin/laundry/actions.ts.
  const eligibleLogs = await prisma.cleanLog.findMany({
    where: {
      laundryLoadId: null,
      arrivedAt: { not: null },
      departedAt: { not: null },
      clean: { status: "COMPLETED" },
    },
    orderBy: { departedAt: "desc" },
    include: {
      clean: {
        include: { property: { select: { name: true, address: true } }, assignedTo: { select: { name: true } } },
      },
    },
  });

  const loads = await prisma.laundryLoad.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      recordedBy: { select: { name: true } },
      logs: { include: { clean: { include: { property: { select: { name: true, address: true } } } } } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laundry</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ticket photo and cost for each laundrette drop-off, and which visits&apos; linen it covered.
        </p>
      </div>

      <section className={card("flex flex-col gap-4 p-4")}>
        <h2 className="text-sm font-medium">Log a drop-off</h2>
        {eligibleLogs.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing unclaimed right now -- every completed visit&apos;s linen is already logged.
          </p>
        ) : (
          <form action={createLaundryLoad} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Which visits went in this load?</legend>
              <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                {eligibleLogs.map((log) => (
                  <label key={log.id} className="flex items-start gap-2 text-sm text-zinc-600">
                    <input type="checkbox" name="cleanLogIds" value={log.id} className="mt-0.5" />
                    <span>
                      {propertyDisplayName(log.clean.property)} · {toIsoDate(log.departedAt!)} ·{" "}
                      {log.clean.assignedTo?.name ?? "Unassigned"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="cost" className="text-sm font-medium">
                  Cost
                </label>
                <input
                  id="cost"
                  name="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  placeholder="e.g. 18.50"
                  className={`${inputCompact} w-28`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="photo" className="text-sm font-medium">
                  Ticket photo
                </label>
                <input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  required
                  className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
              </div>
              <button type="submit" className={button("primary", "sm")}>
                Save
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Logged ({loads.length})</h2>
        {loads.length === 0 ? (
          <p className="text-sm text-zinc-600">No laundry drop-offs logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {loads.map((load) => (
              <li key={load.id}>
                <Link
                  href={`/admin/laundry/${load.id}`}
                  className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/laundry-photos/${load.receiptPath}`}
                    alt="Laundry ticket"
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatCurrency(load.cost)}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {load.logs.map((l) => propertyDisplayName(l.clean.property)).join(", ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {toIsoDate(load.createdAt)} · logged by {load.recordedBy.name}
                    </p>
                  </div>
                  <span className={badge("neutral")}>
                    {load.logs.length} {load.logs.length === 1 ? "visit" : "visits"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
