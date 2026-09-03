import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCleaner, cleanerPropertyWhere } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyCover } from "@/components/PropertyCover";
import { card } from "@/lib/ui";

export const metadata = { title: "Properties" };

export default async function CleanerPropertiesPage() {
  const session = await requireCleaner();

  // Only places this cleaner has been assigned to -- see cleanerPropertyWhere.
  const properties = await prisma.property.findMany({
    where: cleanerPropertyWhere(session.user.id),
    orderBy: { createdAt: "asc" },
    include: { images: { where: { isPrimary: true }, take: 1, select: { path: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Properties</h1>
        <p className="mt-1 text-sm text-zinc-500">Places you&apos;re assigned to.</p>
      </div>

      {properties.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nothing yet — properties appear here once you&apos;re assigned a clean at them.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/cleaner/properties/${p.id}`}
                className={card("flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.02]")}
              >
                <PropertyCover path={p.images[0]?.path} alt={propertyDisplayName(p)} className="h-12 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{propertyDisplayName(p)}</p>
                  <p className="truncate text-sm text-zinc-500">{p.address}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
