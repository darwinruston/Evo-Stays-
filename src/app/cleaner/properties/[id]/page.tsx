import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCleaner, cleanerPropertyWhere } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { card } from "@/lib/ui";

export const metadata = { title: "Property" };

export default async function CleanerPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCleaner();
  const { id } = await params;

  // The assignment check is part of the query, so a property this cleaner has
  // never been sent to doesn't resolve at all -- important here because
  // access notes carry key safe and alarm codes.
  const property = await prisma.property.findFirst({
    where: { id, ...cleanerPropertyWhere(session.user.id) },
    include: { images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
  });
  if (!property) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cleaner/properties" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Properties
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight">
          {propertyDisplayName(property)}
        </h1>
      </div>

      <PropertyDetails property={property} />

      {property.images.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Photos</h2>
          <ul className="grid grid-cols-2 gap-3">
            {property.images.map((img) => (
              <li key={img.id} className={card("overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${img.path}`}
                  alt={propertyDisplayName(property)}
                  className="h-28 w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
