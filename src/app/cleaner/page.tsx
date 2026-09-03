import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";

export const metadata = { title: "My cleans" };

export default async function CleanerHomePage() {
  const session = await requireCleaner();

  const cleans = await prisma.clean.findMany({
    // Only ever this cleaner's own work -- never anyone else's.
    where: { assignedToId: session.user.id },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    include: { property: { select: { name: true, address: true } } },
  });

  const rows: CleanRow[] = cleans.map((c) => ({
    id: c.id,
    href: `/cleaner/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    status: c.status,
    scheduledFor: c.scheduledFor,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">My cleans</h1>
      <CleanList cleans={rows} empty="Nothing assigned to you yet." />
    </div>
  );
}
