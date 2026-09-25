import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffSession } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { propertyDisplayName } from "@/lib/address";
import { button, card } from "@/lib/ui";
import { InfoTooltip } from "@/components/InfoTooltip";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isStaffSession())) return { title: "Client" };
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  return { title: client?.name ?? "Client" };
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) notFound();

  const invoiceCount = await prisma.invoice.count({ where: { property: { clientId: client.id } } });

  // Every cleaner designated on any of this client's properties -- there's
  // no direct Client-to-Cleaner relation, so this is the same designation
  // data the property page's own Cleaners section reads, just aggregated
  // and deduped across the whole portfolio instead of one property.
  const designations = await prisma.propertyCleaner.findMany({
    where: { property: { clientId: client.id } },
    include: { cleaner: { select: { id: true, name: true } } },
  });
  const cleaners = [...new Map(designations.map((d) => [d.cleaner.id, d.cleaner])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Clients
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={client.name} photoPath={client.photoPath} size={56} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {client.email ?? "No email"}
                {client.phone ? ` · ${client.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href={`/admin/invoices?clientId=${client.id}`} className={button("secondary", "sm")}>
              Invoices ({invoiceCount})
            </Link>
            <Link href={`/admin/clients/${client.id}/edit`} className={button("secondary", "sm")}>
              Edit
            </Link>
          </div>
        </div>
        {client.notes && <p className="mt-4 text-sm text-zinc-600">{client.notes}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-500">
          Cleaners ({cleaners.length})
          <InfoTooltip text="Every cleaner designated on any property in this client's portfolio, deduped -- see a property's own page for which properties each one covers." />
        </h2>
        {cleaners.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {cleaners.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/cleaners/${c.id}`}
                  className={card("block p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No cleaner designated on any property yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="whitespace-nowrap text-sm font-medium text-zinc-500">
            Portfolio ({client.properties.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {client.hostifyApiKey && (
              <Link href={`/admin/clients/${client.id}/import`} className={button("secondary", "sm")}>
                Import from Hostify
              </Link>
            )}
            <Link
              href={`/admin/properties/new?clientId=${client.id}`}
              className={button("secondary", "sm")}
            >
              Add property
            </Link>
          </div>
        </div>
        {client.properties.length === 0 ? (
          <p className="text-sm text-zinc-600">No properties yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.properties.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/properties/${p.id}`}
                  className={card("flex items-center justify-between gap-3 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <span className="min-w-0 font-medium">{propertyDisplayName(p)}</span>
                  <span className="shrink-0 whitespace-nowrap text-sm text-zinc-500">
                    {p.bedrooms ?? "?"} bed · sleeps {p.maxOccupancy ?? "?"}
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
