import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { groupByStockArea } from "@/lib/stockAreas";
import { StockAreasManager } from "@/components/StockAreasManager";
import { badge, button, card } from "@/lib/ui";
import {
  addUsualStockAreas,
  createStockArea,
  deleteStockArea,
  moveStockArea,
  renameStockArea,
} from "./actions";

export const metadata = { title: "Stock items" };

export default async function StockItemsPage() {
  const { db } = await requireStaff();

  const [items, areas] = await Promise.all([
    db.stockItem.findMany({
      include: { _count: { select: { levels: true } }, area: { select: { id: true, name: true, position: true } } },
    }),
    db.stockArea.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { items: true } } },
    }),
  ]);

  // Grouped by where each is kept, in the order a cleaner walks through them.
  const groups = groupByStockArea(items, (item) => ({ name: item.name, area: item.area }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/stock" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Stock items</h1>
          <Link href="/admin/stock-items/new" className={button("primary", "sm")}>
            New item
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-600">The catalogue every property&apos;s stock is picked from.</p>

      <StockAreasManager
        areas={areas.map((a) => ({ id: a.id, name: a.name, itemCount: a._count.items }))}
        create={createStockArea}
        rename={renameStockArea}
        move={moveStockArea}
        remove={deleteStockArea}
        addUsual={addUsualStockAreas}
      />

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">No stock items yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.area?.id ?? "none"} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {group.area ? group.area.name : areas.length > 0 ? "No area yet" : "Items"}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/stock-items/${item.id}/edit`}
                      className={card("flex items-center justify-between p-4 transition-colors hover:bg-black/[0.02]")}
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-zinc-500">
                          Configured on {item._count.levels} {item._count.levels === 1 ? "property" : "properties"}
                        </p>
                      </div>
                      {!item.active && <span className={badge("outline")}>Inactive</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
