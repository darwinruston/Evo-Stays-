import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { badge, button, card } from "@/lib/ui";
import { addPropertyPhotos, setPrimaryPhoto, deletePropertyPhoto } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: { name: true, address: true },
  });
  return { title: property ? propertyDisplayName(property) : "Property" };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!property) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/properties" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Properties
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{propertyDisplayName(property)}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <Link href={`/admin/clients/${property.client.id}`} className="hover:text-zinc-900">
                {property.client.name}
              </Link>
            </p>
          </div>
          <Link href={`/admin/properties/${property.id}/edit`} className={button("secondary", "sm")}>
            Edit
          </Link>
        </div>
      </div>

      <PropertyDetails property={property} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Photos ({property.images.length})</h2>

        {property.images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {property.images.map((img) => (
              <li key={img.id} className={card("overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${img.path}`}
                  alt={propertyDisplayName(property)}
                  className="h-32 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-2">
                  {img.isPrimary ? (
                    <span className={badge("solid")}>Cover</span>
                  ) : (
                    <form action={setPrimaryPhoto.bind(null, property.id, img.id)}>
                      <button type="submit" className={button("ghost", "sm")}>
                        Make cover
                      </button>
                    </form>
                  )}
                  <form action={deletePropertyPhoto.bind(null, property.id, img.id)}>
                    <button type="submit" className={button("ghost", "sm")} aria-label="Delete photo">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addPropertyPhotos.bind(null, property.id)}
          className={card("flex max-w-lg flex-col gap-3 p-4")}
        >
          <label htmlFor="photos" className="text-sm font-medium">
            Add photos
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            required
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <div>
            <button type="submit" className={button("primary", "sm")}>
              Upload
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
