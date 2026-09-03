import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";

export const metadata = { title: "Cleans" };

export default async function ClientCleansPage() {
  const { clientId } = await requireClientAccount();

  if (!clientId) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cleans</h1>
        <p className="text-sm text-zinc-600">
          This login isn&apos;t linked to a portfolio yet.
        </p>
      </div>
    );
  }

  // Scoped through the property's owner, so this can only ever return cleans
  // at places in this host's own portfolio.
  const cleans = await prisma.clean.findMany({
    where: { property: { clientId } },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    include: { property: { select: { name: true, address: true } } },
  });

  const rows: CleanRow[] = cleans.map((c) => ({
    id: c.id,
    href: `/client/properties/${c.propertyId}`,
    title: propertyDisplayName(c.property),
    subtitle: c.requestedByClientId ? "You requested this" : null,
    status: c.status,
    scheduledFor: c.scheduledFor,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cleans</h1>
      <CleanList cleans={rows} empty="No cleans booked yet." />
    </div>
  );
}
