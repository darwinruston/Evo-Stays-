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

  // Grouped by property for the "All stock" browse section below -- sorted
  // alphabetically so it reads the same way on every visit, unlike "Running
  // low" above (deliberately ordered by most-recently-updated, which suits
  // an alert feed but not something meant to be scanned as a whole).
  type Level = (typeof levels)[number];
  const byProperty = new Map<string, { property: Level["property"]; levels: Level[] }>();
  for (const level of levels) {
    const group = byProperty.get(level.property.id) ?? { property: level.property, levels: [] };
    group.levels.push(level);
    byProperty.set(level.property.id, group);
  }
  const propertyGroups = [...byProperty.values()]
    .map((group) => ({
      ...group,
      levels: group.levels.sort((a, b) => a.stockItem.name.localeCompare(b.stockItem.name)),
    }))
    .sort((a, b) => propertyDisplayName(a.property).localeCompare(propertyDisplayName(b.property)));

  return (
    <div className="flex flex-col gap-8">
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

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-zinc-500">
          All stock ({levels.length} {levels.length === 1 ? "item" : "items"} across{" "}
          {propertyGroups.length} {propertyGroups.length === 1 ? "property" : "properties"})
        </h2>
        {propertyGroups.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No property has stock levels set up yet — add some from a property&apos;s own page.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {propertyGroups.map(({ property, levels: propertyLevels }) => (
              <div key={property.id} className="flex flex-col gap-2">
                <Link
                  href={`/admin/properties/${property.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline"
                >
                  {propertyDisplayName(property)}{" "}
                  <span className="font-normal text-zinc-500">· {property.client.name}</span>
                </Link>
                <ul className="flex flex-col gap-2">
                  {propertyLevels.map((level) => (
                    <li key={level.id} className={card("flex items-center justify-between gap-4 p-4")}>
                      <p className="font-medium">{level.stockItem.name}</p>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-zinc-500">
                          {level.onHandQty} / {level.parQty}
                        </span>
                        <StockLevelIndicator level={level} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
