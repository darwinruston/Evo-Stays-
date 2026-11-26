import { ConfirmAction } from "@/components/ConfirmAction";
import { currentRegion } from "@/lib/region";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanForm } from "../../CleanForm";
import { updateClean, deleteClean } from "../../actions";
import { getCleanerOptions } from "@/lib/cleans";

export const metadata = { title: "Edit clean" };

export default async function EditCleanPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireStaff();
  const { id } = await params;

  const clean = await db.clean.findUnique({
    where: { id },
    include: { property: { select: { nickname: true, name: true, address: true, maxOccupancy: true } } },
  });
  if (!clean) notFound();

  const cleaners = await getCleanerOptions(db);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/cleans/${clean.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {propertyDisplayName(clean.property)}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit clean</h1>
      </div>

      <CleanForm
        dateFormat={currentRegion().dateOrder === "mdy" ? "mm/dd/yyyy" : "dd/mm/yyyy"}
        action={updateClean.bind(null, clean.id)}
        clean={clean}
        properties={[]}
        cleaners={cleaners}
        propertyMaxOccupancy={clean.property.maxOccupancy}
        submitLabel="Save changes"
      />

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        <p className="text-sm text-zinc-600">
          Removes this clean and anything recorded against it. To keep the record but call it
          off, set the status to cancelled instead.
        </p>
        <ConfirmAction
          action={deleteClean.bind(null, clean.id)}
          label="Delete clean"
          question="Delete this clean, with its photos and everything recorded against it? This cannot be undone."
        />
      </section>
    </div>
  );
}
