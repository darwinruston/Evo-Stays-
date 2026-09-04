import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency } from "@/lib/invoices";
import { formatDate, formatScheduledFor } from "@/lib/schedule";
import { badge, button, card } from "@/lib/ui";
import { deleteLaundryLoad, setLaundryLoadCollected } from "../actions";

export const metadata = { title: "Laundry load" };

export default async function LaundryLoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const load = await prisma.laundryLoad.findUnique({
    where: { id },
    include: {
      recordedBy: { select: { name: true } },
      logs: {
        orderBy: { departedAt: "asc" },
        include: {
          clean: {
            include: { property: { select: { id: true, name: true, address: true } }, assignedTo: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!load) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/laundry" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Laundry
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{formatCurrency(load.cost)}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{load.facility}</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {formatDate(load.createdAt)} · logged by {load.recordedBy.name}
            </p>
          </div>
          <span className={badge(load.collectedAt ? "solid" : "neutral")}>
            {load.collectedAt ? `Collected ${formatDate(load.collectedAt)}` : "Out at the laundrette"}
          </span>
        </div>
      </div>

      <form action={setLaundryLoadCollected.bind(null, load.id, null, !load.collectedAt)}>
        <button type="submit" className={button(load.collectedAt ? "secondary" : "primary", "sm")}>
          {load.collectedAt ? "Mark as not collected" : "Mark as collected"}
        </button>
      </form>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/laundry-photos/${load.receiptPath}`}
        alt="Laundry ticket"
        className={card("max-w-sm overflow-hidden object-cover")}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Visits covered ({load.logs.length})</h2>
        <ul className="flex flex-col gap-2">
          {load.logs.map((log) => (
            <li key={log.id}>
              <Link
                href={`/admin/cleans/${log.cleanId}`}
                className={card("flex items-center justify-between gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <div className="min-w-0">
                  <p className="font-medium">{propertyDisplayName(log.clean.property)}</p>
                  <p className="truncate text-sm text-zinc-500">{log.clean.assignedTo?.name ?? "Unassigned"}</p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500">
                  {log.departedAt ? formatScheduledFor(log.departedAt) : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Remove</h2>
        <p className="text-sm text-zinc-600">
          Frees the visits above to be included in a different load. The ticket photo isn&apos;t deleted from
          storage.
        </p>
        <form action={deleteLaundryLoad.bind(null, load.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Delete this load
          </button>
        </form>
      </section>
    </div>
  );
}
