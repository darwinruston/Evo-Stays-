import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { card } from "@/lib/ui";

// Scoped like the page itself -- a title is a small leak, but it would still
// confirm another host's property exists.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { clientId } = await requireClientAccount();
  const { id } = await params;
  if (!clientId) return { title: "Property" };
  const property = await prisma.property.findFirst({
    where: { id, clientId },
    select: { name: true, address: true },
  });
  return { title: property ? propertyDisplayName(property) : "Property" };
}

export default async function ClientPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { clientId } = await requireClientAccount();
  const { id } = await params;

  // Scoped by clientId in the query itself rather than fetched-then-checked:
  // another host's property id simply doesn't resolve, so there's no branch
  // left where the wrong record could leak through.
  const property = clientId
    ? await prisma.property.findFirst({
        where: { id, clientId },
        include: { images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
      })
    : null;
  if (!property) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/client" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← My portfolio
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {propertyDisplayName(property)}
        </h1>
      </div>

      <PropertyDetails property={property} />

      {property.images.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Photos</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {property.images.map((img) => (
              <li key={img.id} className={card("overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${img.path}`}
                  alt={propertyDisplayName(property)}
                  className="h-32 w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
