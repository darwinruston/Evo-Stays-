"use client";

import { useState } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import { STOCK_BANDS, STOCK_BAND_LABELS } from "@/lib/stock";
import { button, card, inputCompact } from "@/lib/ui";

// Two steps, not one form with both fields at once: pick the item first: the
// level picker (High/Medium/Low/None) only appears once an item's actually
// chosen, rather than sitting there the whole time asking a question that
// doesn't make sense yet ("level of... what?").
export function AddStockLevelForm({
  action,
  items,
}: {
  action: (formData: FormData) => Promise<void>;
  items: { id: string; name: string }[];
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);
  const [itemId, setItemId] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setItemId("");
          setOpen(true);
        }}
        className={button("secondary", "sm")}
      >
        + Add stock item
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex flex-wrap items-end gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stockItemId" className="text-sm font-medium">
          Item
        </label>
        <select
          id="stockItemId"
          name="stockItemId"
          required
          autoFocus
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className={inputCompact}
        >
          <option value="" disabled>
            Choose…
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {itemId && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="band" className="text-sm font-medium">
            Level right now
          </label>
          <select id="band" name="band" defaultValue="high" className={inputCompact}>
            {STOCK_BANDS.map((b) => (
              <option key={b} value={b}>
                {STOCK_BAND_LABELS[b]}
              </option>
            ))}
          </select>
        </div>
      )}

      {itemId && (
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Adding…" : "Add"}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setItemId("");
        }}
        className={button("ghost", "sm")}
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
