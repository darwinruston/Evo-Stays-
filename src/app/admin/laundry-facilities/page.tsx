import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { badge, button, card } from "@/lib/ui";

export const metadata = { title: "Laundry companies" };

export default async function LaundryFacilitiesPage() {
  await requireStaff();

  const facilities = await prisma.laundryFacility.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { loads: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/laundry" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Laundry
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Laundry companies</h1>
          <Link href="/admin/laundry-facilities/new" className={button("primary", "sm")}>
            New facility
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        The catalogue a laundry drop-off picks its facility from.
      </p>

      {facilities.length === 0 ? (
        <p className="text-sm text-zinc-600">No laundry companies yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {facilities.map((facility) => (
            <li key={facility.id}>
              <Link
                href={`/admin/laundry-facilities/${facility.id}/edit`}
                className={card("flex items-center justify-between p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <div>
                  <p className="font-medium">{facility.name}</p>
                  <p className="text-sm text-zinc-500">
                    {facility._count.loads} {facility._count.loads === 1 ? "load" : "loads"} logged
                  </p>
                </div>
                {!facility.active && <span className={badge("outline")}>Inactive</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
