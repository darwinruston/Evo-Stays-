import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency } from "@/lib/invoices";
import { formatDate } from "@/lib/schedule";
import { badge, card } from "@/lib/ui";
import { LaundryLoadWizard } from "@/components/LaundryLoadWizard";
import { createLaundryLoad } from "./actions";
import { createLaundryFacilityQuick } from "../laundry-facilities/actions";

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

  const facilities = await prisma.laundryFacility.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const loads = await prisma.laundryLoad.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      facility: { select: { name: true } },
      recordedBy: { select: { name: true } },
      logs: { include: { clean: { include: { property: { select: { name: true, address: true } } } } } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laundry</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ticket photo and cost for each laundrette drop-off, and which visits&apos; linen it covered.
          </p>
        </div>
        <Link href="/admin/laundry-facilities" className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900">
          Manage launderettes →
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Log a drop-off</h2>
        <LaundryLoadWizard
          eligibleVisits={eligibleLogs.map((log) => ({
            id: log.id,
            label: `${propertyDisplayName(log.clean.property)} · ${formatDate(log.departedAt!)} · ${log.clean.assignedTo?.name ?? "Unassigned"}`,
          }))}
          facilities={facilities}
          manageFacilitiesHref="/admin/laundry-facilities"
          onCreateFacility={createLaundryFacilityQuick}
          action={createLaundryLoad}
        />
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
                    <p className="font-medium">
                      {formatCurrency(load.cost)} · {load.facility.name}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {load.logs.map((l) => propertyDisplayName(l.clean.property)).join(", ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(load.createdAt)} · logged by {load.recordedBy.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={badge("neutral")}>
                      {load.logs.length} {load.logs.length === 1 ? "visit" : "visits"}
                    </span>
                    <span className={badge(load.collectedAt ? "solid" : "neutral")}>
                      {load.collectedAt ? "Collected" : "Out"}
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
