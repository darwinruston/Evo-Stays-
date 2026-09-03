import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { isRunningLow } from "@/lib/stock";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { card } from "@/lib/ui";

export const metadata = { title: "Overview" };

// Today through 6 days out -- the same rolling window cleanTimeGroup already
// buckets as Today/Tomorrow/This week, so filtering to it here just narrows
// the query rather than introducing a second definition of "this week".
function weekWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export default async function AdminHomePage() {
  const session = await requireStaff();
  const { start, end } = weekWindow();

  const [clients, properties, upcoming, unscheduled, stockLevels, thisWeek] = await Promise.all([
    prisma.client.count(),
    prisma.property.count(),
    prisma.clean.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    // Still needs a slot -- the one number here that means something is
    // waiting to be scheduled.
    prisma.clean.count({ where: { status: "PENDING", scheduledFor: null } }),
    // "Low" compares two columns on the same row, which SQLite can't express
    // in a where clause without raw SQL -- filtered in JS instead, see
    // src/lib/stock.ts.
    prisma.propertyStockLevel.findMany({ select: { propertyId: true, onHandQty: true, parQty: true } }),
    prisma.clean.findMany({
      where: { scheduledFor: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      orderBy: { scheduledFor: "asc" },
      include: {
        property: { select: { name: true, address: true, client: { select: { name: true } } } },
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  const lowProperties = new Set(stockLevels.filter(isRunningLow).map((l) => l.propertyId)).size;

  const tiles = [
    { href: "/admin/clients", label: "Clients", value: clients },
    { href: "/admin/properties", label: "Properties", value: properties },
    { href: "/admin/cleans", label: "Cleans outstanding", value: upcoming },
    { href: "/admin/cleans", label: "Unscheduled cleans", value: unscheduled },
    { href: "/admin/stock", label: "Properties running low", value: lowProperties },
  ];

  const thisWeekRows: CleanRow[] = thisWeek.map((c) => ({
    id: c.id,
    href: `/admin/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    subtitle: `${c.property.client.name} · ${c.assignedTo?.name ?? "Unassigned"}`,
    status: c.status,
    scheduledFor: c.scheduledFor,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.name} · {session.user.role}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={card("p-5 transition-colors hover:bg-black/[0.02]")}>
            <p className="text-sm text-zinc-500">{t.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{t.value}</p>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">This week</h2>
          <Link href="/admin/cleans" className="text-sm text-zinc-500 hover:text-zinc-900">
            All cleans →
          </Link>
        </div>
        <CleanList cleans={thisWeekRows} empty="Nothing scheduled in the next 7 days." />
      </section>
    </div>
  );
}
