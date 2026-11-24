"use client";

import type { ActionResult } from "@/lib/actionResult";
import { useRevealForm } from "@/lib/useRevealForm";
import { STOCK_BANDS, STOCK_BAND_LABELS } from "@/lib/stock";
import { button, card, inputCompact } from "@/lib/ui";

// Adds every item from the stock list that this property does not have yet,
// all at the level chosen here. Behind a button first, like the one-item form
// beside it, so it is not a stray click.
export function AddAllStockForm({
  action,
  count,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  count: number;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${button("secondary", "sm")} self-start`}>
        Add all stock ({count})
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex flex-wrap items-end gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="allBand" className="text-sm font-medium">
          Add all {count} {count === 1 ? "item" : "items"} at the level
        </label>
        <select id="allBand" name="band" defaultValue="high" className={inputCompact}>
          {STOCK_BANDS.map((b) => (
            <option key={b} value={b}>
              {STOCK_BAND_LABELS[b]}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={button("primary", "sm")}>
        {pending ? "Adding…" : "Add all"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
        Cancel
      </button>
      <p className="w-full text-xs text-zinc-500">
        Items already on this property keep their level. Cleaners correct the levels on their first visit.
      </p>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
