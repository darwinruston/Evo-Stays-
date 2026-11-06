import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { createStockItem } from "../actions";
import { StockItemFields } from "@/components/StockItemFields";
import { button } from "@/lib/ui";

export const metadata = { title: "New stock item" };

export default async function NewStockItemPage() {
  const { db } = await requireStaff();
  const areas = await db.stockArea.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/stock-items" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock items
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New stock item</h1>
      </div>

      <form action={createStockItem} className="flex max-w-lg flex-col gap-4">
        <StockItemFields areas={areas} namePlaceholder="Toilet roll" />

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Create item
          </button>
        </div>
      </form>
    </div>
  );
}
