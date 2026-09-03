import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { isRunningLow } from "@/lib/stock";
import { StockLevelIndicator } from "@/components/StockLevelIndicator";
import { card } from "@/lib/ui";

export const metadata = { title: "Stock" };

export default async function StockOverviewPage() {
  await requireStaff();

  // Every configured level, not just low ones -- filtering happens here in
  // JS rather than in the query, since "low" is a comparison between two
  // columns on the same row (SQLite can't express that in a where clause
  // without raw SQL, and this list is small enough that it doesn't matter).
  const levels = await prisma.propertyStockLevel.findMany({
    include: {
      stockItem: true,
      property: { select: { id: true, name: true, address: true, client: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const low = levels.filter(isRunningLow);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
        <Link href="/admin/stock-items" className="text-sm text-zinc-500 hover:text-zinc-900">
          Manage catalogue →
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Running low ({low.length})</h2>
        {low.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing below par right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {low.map((level) => (
              <li key={level.id}>
                <Link
                  href={`/admin/properties/${level.property.id}`}
                  className={card("flex items-center justify-between gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{level.stockItem.name}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {propertyDisplayName(level.property)} · {level.property.client.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      {level.onHandQty} / {level.parQty}
                    </span>
                    <StockLevelIndicator level={level} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
