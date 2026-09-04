import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency } from "@/lib/invoices";
import { toIsoDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { createLaundryLoad } from "../actions";

export const metadata = { title: "Laundry" };

export default async function CleanerLaundryPage() {
  const session = await requireCleaner();

  // This cleaner's own completed visits not already claimed by a load --
  // same eligibility rule createLaundryLoad re-validates server-side.
  const eligibleLogs = await prisma.cleanLog.findMany({
    where: {
      laundryLoadId: null,
      arrivedAt: { not: null },
      departedAt: { not: null },
      clean: { status: "COMPLETED", assignedToId: session.user.id },
    },
    orderBy: { departedAt: "desc" },
    include: { clean: { include: { property: { select: { name: true, address: true } } } } },
  });

  // Loads covering any of this cleaner's own visits -- even one office
  // staff logged on their behalf, so they can see it was actually done.
  const loads = await prisma.laundryLoad.findMany({
    where: { logs: { some: { clean: { assignedToId: session.user.id } } } },
    orderBy: { createdAt: "desc" },
    include: {
      recordedBy: { select: { name: true } },
      logs: { include: { clean: { include: { property: { select: { name: true, address: true } } } } } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Laundry</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Log where dirty linen went and what it cost -- one drop-off can cover several visits.
        </p>
      </div>

      <section className={card("flex flex-col gap-3 p-4")}>
        <h2 className="text-sm font-medium">Log a drop-off</h2>
        {eligibleLogs.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing unclaimed right now -- every completed visit&apos;s linen is already logged.
          </p>
        ) : (
          <form action={createLaundryLoad} className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Which visits went in this load?</legend>
              <div className="flex flex-col gap-1.5">
                {eligibleLogs.map((log) => (
                  <label key={log.id} className="flex items-start gap-2 text-sm text-zinc-600">
                    <input type="checkbox" name="cleanLogIds" value={log.id} className="mt-0.5" />
                    <span>
                      {propertyDisplayName(log.clean.property)} · {toIsoDate(log.departedAt!)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

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
                className={inputCompact}
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
                capture="environment"
                required
                className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>

            <button type="submit" className={`w-full ${button("primary", "lg")}`}>
              Save
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Logged ({loads.length})</h2>
        {loads.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {loads.map((load) => (
              <li key={load.id} className={card("flex items-center gap-3 p-3")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/laundry-photos/${load.receiptPath}`}
                  alt="Laundry ticket"
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatCurrency(load.cost)}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {load.logs.map((l) => propertyDisplayName(l.clean.property)).join(", ")}
                  </p>
                </div>
                <span className={badge("neutral")}>
                  {load.logs.length} {load.logs.length === 1 ? "visit" : "visits"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
