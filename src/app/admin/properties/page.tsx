import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyCover } from "@/components/PropertyCover";
import { button, card } from "@/lib/ui";

export const metadata = { title: "Properties" };

export default async function PropertiesPage() {
  await requireStaff();

  const properties = await prisma.property.findMany({
    orderBy: [{ client: { name: "asc" } }, { createdAt: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      images: { where: { isPrimary: true }, take: 1, select: { path: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Link href="/admin/properties/new" className={button("primary", "sm")}>
          New property
        </Link>
      </div>

      {properties.length === 0 ? (
        <p className="text-sm text-zinc-600">No properties yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/properties/${p.id}`}
                className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <PropertyCover path={p.images[0]?.path} alt={propertyDisplayName(p)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{propertyDisplayName(p)}</p>
                  <p className="truncate text-sm text-zinc-500">{p.client.name}</p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500">
                  {p.bedrooms ?? "?"} bed · sleeps {p.maxOccupancy ?? "?"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
