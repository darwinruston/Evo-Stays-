import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { isRunningLow } from "@/lib/stock";
import { card } from "@/lib/ui";

export const metadata = { title: "Overview" };

export default async function AdminHomePage() {
  const session = await requireStaff();

  const [clients, properties, upcoming, unscheduled, stockLevels] = await Promise.all([
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
  ]);

  const lowProperties = new Set(stockLevels.filter(isRunningLow).map((l) => l.propertyId)).size;

  const tiles = [
    { href: "/admin/clients", label: "Clients", value: clients },
    { href: "/admin/properties", label: "Properties", value: properties },
    { href: "/admin/cleans", label: "Cleans outstanding", value: upcoming },
    { href: "/admin/cleans", label: "Unscheduled cleans", value: unscheduled },
    { href: "/admin/stock", label: "Properties running low", value: lowProperties },
  ];

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
