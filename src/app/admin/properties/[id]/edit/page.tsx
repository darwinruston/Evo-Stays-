import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyForm } from "../../PropertyForm";
import { updateProperty, deleteProperty } from "../../actions";
import { button } from "@/lib/ui";

export const metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!property) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/properties/${property.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {propertyDisplayName(property)}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit property</h1>
        <p className="mt-1 text-sm text-zinc-500">{property.client.name}</p>
      </div>

      <PropertyForm
        action={updateProperty.bind(null, property.id)}
        property={property}
        clients={[property.client]}
        submitLabel="Save changes"
      />

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        <p className="text-sm text-zinc-600">
          Removes this property and its photos. This cannot be undone.
        </p>
        <form action={deleteProperty.bind(null, property.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Delete property
          </button>
        </form>
      </section>
    </div>
  );
}
