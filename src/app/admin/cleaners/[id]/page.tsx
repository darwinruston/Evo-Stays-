import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { formatCurrency } from "@/lib/invoices";
import { button, card, inputCompact } from "@/lib/ui";
import { deleteCleaner, updateCleanerRate } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleaner = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: cleaner?.name ?? "Cleaner" };
}

export default async function CleanerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const cleaner = await prisma.user.findUnique({
    where: { id, role: "CLEANER" },
    include: {
      assignedCleans: {
        orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
        include: { property: { select: { name: true, address: true, client: { select: { name: true } } } } },
      },
    },
  });
  if (!cleaner) notFound();

  const rows: CleanRow[] = cleaner.assignedCleans.map((c) => ({
    id: c.id,
    href: `/admin/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    subtitle: c.property.client.name,
    status: c.status,
    scheduledFor: c.scheduledFor,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/cleaners" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleaners
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <Avatar name={cleaner.name} size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{cleaner.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {cleaner.email}
              {cleaner.hourlyRate !== null && ` · ${formatCurrency(cleaner.hourlyRate)}/hr`}
            </p>
          </div>
        </div>
      </div>

      <section className={card("flex flex-wrap items-end gap-3 p-4")}>
        <form action={updateCleanerRate.bind(null, cleaner.id)} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="hourlyRate" className="text-sm font-medium">
              Hourly rate
            </label>
            <input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={cleaner.hourlyRate ?? ""}
              placeholder="e.g. 15.00"
              className={`${inputCompact} w-28`}
            />
          </div>
          <button type="submit" className={button("secondary", "sm")}>
            Save
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          Used to generate invoices — see{" "}
          <Link href="/admin/invoices" className="underline underline-offset-2">
            Invoices
          </Link>
          . Changing it only affects invoices generated after today.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Schedule ({cleaner.assignedCleans.length})
        </h2>
        <CleanList cleans={rows} empty="Nothing assigned to this cleaner yet." />
      </section>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Remove</h2>
        <p className="text-sm text-zinc-600">
          Only possible while this cleaner has no completed cleans on record — history stays
          attributed to whoever actually did the work.
        </p>
        <form action={deleteCleaner.bind(null, cleaner.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Remove cleaner
          </button>
        </form>
      </section>
    </div>
  );
}
