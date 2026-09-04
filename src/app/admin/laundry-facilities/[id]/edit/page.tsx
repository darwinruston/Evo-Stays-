import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { updateLaundryFacility, deleteLaundryFacility } from "../../actions";
import { button, inputCompact } from "@/lib/ui";

export const metadata = { title: "Edit launderette" };

export default async function EditLaundryFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const facility = await prisma.laundryFacility.findUnique({
    where: { id },
    include: { _count: { select: { loads: true } } },
  });
  if (!facility) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/laundry-facilities" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Launderettes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit launderette</h1>
      </div>

      <form action={updateLaundryFacility.bind(null, facility.id)} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" required defaultValue={facility.name} className={inputCompact} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={facility.active} />
          Active — offered when logging a new laundry drop-off
        </label>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Save changes
          </button>
        </div>
      </form>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        {facility._count.loads > 0 ? (
          <p className="text-sm text-zinc-600">
            This facility has {facility._count.loads} {facility._count.loads === 1 ? "load" : "loads"}{" "}
            logged against it, so it can&apos;t be deleted — turn off &quot;Active&quot; above instead.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-600">Not used by any load yet. This cannot be undone.</p>
            <form action={deleteLaundryFacility.bind(null, facility.id)}>
              <button type="submit" className={button("danger", "sm")}>
                Delete facility
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
