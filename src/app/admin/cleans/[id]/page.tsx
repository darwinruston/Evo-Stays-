import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { CleanLogView } from "@/components/CleanLogView";
import { badge, button, card } from "@/lib/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clean = await prisma.clean.findUnique({
    where: { id },
    select: { property: { select: { name: true, address: true } } },
  });
  return { title: clean ? `Clean · ${propertyDisplayName(clean.property)}` : "Clean" };
}

export default async function CleanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const clean = await prisma.clean.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, address: true, client: { select: { id: true, name: true } } } },
      assignedTo: { select: { name: true } },
      requestedByClient: { select: { name: true } },
      log: { include: { recordedBy: { select: { name: true } }, photos: true } },
    },
  });
  if (!clean) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/cleans" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleans
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link href={`/admin/properties/${clean.property.id}`} className="hover:underline">
                {propertyDisplayName(clean.property)}
              </Link>
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <Link href={`/admin/clients/${clean.property.client.id}`} className="hover:text-zinc-900">
                {clean.property.client.name}
              </Link>
            </p>
          </div>
          <Link href={`/admin/cleans/${clean.id}/edit`} className={button("secondary", "sm")}>
            Edit
          </Link>
        </div>
      </div>

      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Status</span>
          <span className={badge(clean.status === "COMPLETED" ? "solid" : "neutral")}>
            {CLEAN_STATUS_LABELS[clean.status]}
          </span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Scheduled</span>
          <span>{clean.scheduledFor ? formatScheduledFor(clean.scheduledFor) : "Not scheduled"}</span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Cleaner</span>
          <span>{clean.assignedTo?.name ?? "Unassigned"}</span>
        </div>
      </div>

      {clean.requestedByClient && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">
            Requested by {clean.requestedByClient.name}
          </h2>
          {clean.clientNote && (
            <p className="text-sm whitespace-pre-line text-zinc-600">{clean.clientNote}</p>
          )}
        </section>
      )}

      {clean.instructions && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Instructions</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{clean.instructions}</p>
        </section>
      )}

      {clean.log && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">What happened</h2>
          <CleanLogView log={clean.log} alt={propertyDisplayName(clean.property)} />
        </section>
      )}
    </div>
  );
}
