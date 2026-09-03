import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanForm } from "../../CleanForm";
import { updateClean, deleteClean } from "../../actions";
import { button } from "@/lib/ui";

export const metadata = { title: "Edit clean" };

export default async function EditCleanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const clean = await prisma.clean.findUnique({
    where: { id },
    include: { property: { select: { name: true, address: true } } },
  });
  if (!clean) notFound();

  const cleaners = await prisma.user.findMany({
    where: { role: "CLEANER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/cleans/${clean.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {propertyDisplayName(clean.property)}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit clean</h1>
      </div>

      <CleanForm
        action={updateClean.bind(null, clean.id)}
        clean={clean}
        properties={[]}
        cleaners={cleaners}
        submitLabel="Save changes"
      />

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        <p className="text-sm text-zinc-600">
          Removes this clean and anything recorded against it. To keep the record but call it
          off, set the status to cancelled instead.
        </p>
        <form action={deleteClean.bind(null, clean.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Delete clean
          </button>
        </form>
      </section>
    </div>
  );
}
