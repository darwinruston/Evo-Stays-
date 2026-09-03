import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { createStockItem } from "../actions";
import { button, inputCompact } from "@/lib/ui";

export const metadata = { title: "New stock item" };

export default async function NewStockItemPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/stock-items" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock items
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New stock item</h1>
      </div>

      <form action={createStockItem} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" required placeholder="Toilet roll" className={inputCompact} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit" className="text-sm font-medium">
            Unit
          </label>
          <input id="unit" name="unit" placeholder="roll" className={inputCompact} />
          <p className="text-xs text-zinc-500">Optional — shown next to the count, e.g. &quot;6 rolls&quot;.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="usagePerGuestNight" className="text-sm font-medium">
            Usage per guest per night
          </label>
          <input
            id="usagePerGuestNight"
            name="usagePerGuestNight"
            type="number"
            min={0}
            step="0.1"
            placeholder="0.5"
            className={inputCompact}
          />
          <p className="text-xs text-zinc-500">
            Optional. When set, the cleaner&apos;s stock count starts pre-filled with an estimate
            from guests × nights instead of the last known figure — they still confirm it against
            the shelf.
          </p>
        </div>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Create item
          </button>
        </div>
      </form>
    </div>
  );
}
