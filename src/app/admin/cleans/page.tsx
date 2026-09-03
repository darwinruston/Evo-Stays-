import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { button } from "@/lib/ui";

export const metadata = { title: "Cleans" };

export default async function CleansPage() {
  await requireStaff();

  const cleans = await prisma.clean.findMany({
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    include: {
      property: { select: { name: true, address: true, client: { select: { name: true } } } },
      assignedTo: { select: { name: true } },
    },
  });

  const rows: CleanRow[] = cleans.map((c) => ({
    id: c.id,
    href: `/admin/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    subtitle: `${c.property.client.name} · ${c.assignedTo?.name ?? "Unassigned"}`,
    status: c.status,
    scheduledFor: c.scheduledFor,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cleans</h1>
        <Link href="/admin/cleans/new" className={button("primary", "sm")}>
          Schedule a clean
        </Link>
      </div>

      <CleanList cleans={rows} empty="No cleans scheduled yet." />
    </div>
  );
}
