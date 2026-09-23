import Link from "next/link";
import type { Prisma, CleanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { CleanFilters } from "@/components/CleanFilters";
import { button } from "@/lib/ui";
import { CLEAN_STATUS_LABELS, isCleanFinished } from "@/lib/cleans";
import { cleanPrep } from "@/lib/cleanPrep";

export const metadata = { title: "Cleans" };

export default async function CleansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; propertyId?: string; cleanerId?: string }>;
}) {
  await requireStaff();
  const { status, propertyId, cleanerId } = await searchParams;

  const where: Prisma.CleanWhereInput = {};
  if (status && status in CLEAN_STATUS_LABELS) where.status = status as CleanStatus;
  if (propertyId) where.propertyId = propertyId;
  if (cleanerId === "unassigned") where.assignedToId = null;
  else if (cleanerId) where.assignedToId = cleanerId;

  const hasFilters = !!(status || propertyId || cleanerId);

  // Carried onto each clean's own link so its detail page can send "← Cleans"
  // back to this exact filtered view instead of always resetting to the
  // unfiltered list -- see the matching reconstruction in
  // src/app/admin/cleans/[id]/page.tsx.
  const filterParams = new URLSearchParams();
  if (status) filterParams.set("status", status);
  if (propertyId) filterParams.set("propertyId", propertyId);
  if (cleanerId) filterParams.set("cleanerId", cleanerId);
  const filterQuery = filterParams.toString();

  const [cleans, properties, cleaners] = await Promise.all([
    prisma.clean.findMany({
      where,
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
      include: {
        property: {
          select: {
            name: true,
            address: true,
            bedrooms: true,
            bathrooms: true,
            maxOccupancy: true,
            sofaBedSleeps: true,
            client: { select: { name: true } },
          },
        },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.property.findMany({
      orderBy: [{ client: { name: "asc" } }, { createdAt: "asc" }],
      select: { id: true, name: true, address: true, client: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: "CLEANER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: CleanRow[] = cleans.map((c) => ({
    id: c.id,
    href: `/admin/cleans/${c.id}${filterQuery ? `?${filterQuery}` : ""}`,
    title: propertyDisplayName(c.property),
    subtitle: `${c.property.client.name} · ${c.assignedTo?.name ?? "Unassigned"}`,
    status: c.status,
    scheduledFor: c.scheduledFor,
    prep: isCleanFinished(c.status) ? null : cleanPrep(c.property, c.guestCount),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cleans</h1>
        <Link href="/admin/cleans/new" className={button("primary", "sm")}>
          Schedule a clean
        </Link>
      </div>

      <CleanFilters
        properties={properties.map((p) => ({
          id: p.id,
          label: `${p.client.name} — ${propertyDisplayName(p)}`,
        }))}
        cleaners={cleaners}
      />

      <CleanList
        cleans={rows}
        empty={hasFilters ? "No cleans match these filters." : "No cleans scheduled yet."}
        flat={hasFilters}
      />
    </div>
  );
}
