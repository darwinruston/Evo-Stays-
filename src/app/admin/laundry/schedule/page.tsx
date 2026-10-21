import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { loadLinenDay } from "@/lib/linenPlan";
import { parseIsoDate, toIsoDate } from "@/lib/schedule";
import { LinenScheduleView } from "@/components/LinenScheduleView";
import { button } from "@/lib/ui";

export const metadata = { title: "Delivery schedule" };

// What a linen company sees, for staff: the same plan, so a clash (two
// properties they can't both reach in time) is noticed here and sorted out
// before the linen company finds it on the day.
export default async function LinenSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ facilityId?: string; day?: string }>;
}) {
  const { db } = await requireStaff();
  const { facilityId, day: dayParam } = await searchParams;

  const facilities = await db.laundryFacility.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { properties: true } } },
  });
  const withProperties = facilities.filter((f) => f._count.properties > 0);
  const selected = facilities.find((f) => f.id === facilityId) ?? withProperties[0] ?? facilities[0];

  const day = (dayParam ? parseIsoDate(dayParam) : null) ?? new Date();
  const data = selected ? await loadLinenDay(db, selected.id, day) : null;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/laundry" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Laundry
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Delivery schedule</h1>
        <p className="mt-1 text-sm text-zinc-500">
          When the linen company needs to be at each property, worked out from when each cleaner arrives.
        </p>
      </div>

      {facilities.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {facilities.map((f) => (
            <Link
              key={f.id}
              href={`/admin/laundry/schedule?facilityId=${f.id}&day=${toIsoDate(day)}`}
              className={button(f.id === selected?.id ? "primary" : "secondary", "sm")}
            >
              {f.name}
            </Link>
          ))}
        </div>
      )}

      {!selected && (
        <p className="text-sm text-zinc-600">
          Add a{" "}
          <Link href="/admin/laundry-facilities/new" className="underline underline-offset-2">
            laundry company
          </Link>{" "}
          first, then choose it on each property it supplies.
        </p>
      )}

      {selected && selected._count.properties === 0 && (
        <p className="text-sm text-zinc-600">
          No properties use {selected.name} yet. Choose it under &quot;Linen company&quot; on each property&apos;s edit
          page.
        </p>
      )}

      {data && (
        <LinenScheduleView
          data={data}
          mode="staff"
          hrefForDay={(iso) => `/admin/laundry/schedule?facilityId=${data.facility.id}&day=${iso}`}
          hrefForClean={(id) => `/admin/cleans/${id}`}
        />
      )}

      {selected && (
        <Link
          href={`/admin/laundry-facilities/${selected.id}/edit`}
          className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
        >
          Delivery settings and logins for {selected.name}
        </Link>
      )}
    </div>
  );
}
