import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { updateStockItem, deleteStockItem } from "../../actions";
import { StockItemFields } from "@/components/StockItemFields";
import { button } from "@/lib/ui";

export const metadata = { title: "Edit stock item" };

export default async function EditStockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireStaff();
  const { id } = await params;

  const item = await db.stockItem.findUnique({
    where: { id },
    include: { _count: { select: { levels: true, usage: true } } },
  });
  if (!item) notFound();
  const areas = await db.stockArea.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/stock-items" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock items
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit stock item</h1>
      </div>

      <form action={updateStockItem.bind(null, item.id)} className="flex max-w-lg flex-col gap-4">
        <StockItemFields areas={areas} initialName={item.name} initialAreaId={item.areaId ?? ""} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item.active} />
          Active: shows up when adding it to a property
        </label>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Save changes
          </button>
        </div>
      </form>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        {item._count.usage > 0 ? (
          <p className="text-sm text-zinc-600">
            This item has recorded usage on {item._count.usage}{" "}
            {item._count.usage === 1 ? "clean" : "cleans"}, so it can&apos;t be deleted. Turn off
            &quot;Active&quot; above instead.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-600">
              {item._count.levels > 0
                ? `Also removes it from the ${item._count.levels} ${item._count.levels === 1 ? "property it's" : "properties it's"} configured on.`
                : "Not configured on any property."}{" "}
              This cannot be undone.
            </p>
            <form action={deleteStockItem.bind(null, item.id)}>
              <button type="submit" className={button("danger", "sm")}>
                Delete item
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
