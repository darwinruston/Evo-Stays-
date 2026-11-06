"use client";

import { useState } from "react";
import { STOCK_BAND_LABELS, type StockLevelBand } from "@/lib/stock";
import { button, card } from "@/lib/ui";

const BAND_ORDER: StockLevelBand[] = ["high", "medium", "low", "none"];

// One item at a time, tap-only: no typing, which is the whole point.
// Tapping a level doesn't submit on its own -- it just becomes the selected
// answer (starting as `predicted`, the fast "this looks right" path), and
// only Confirm actually records it and advances to the next item. Tapping
// one of the three alternatives used to submit immediately, which meant
// there was no chance to double-check a correction before it was already
// recorded and the cleaner had moved on to the next item.
//
// Rendered with `key={stockItemId}` by the caller so `selected` resets to
// that item's own prediction on every new item, rather than carrying over
// the previous item's pick into one this component didn't actually unmount
// for.
export function StockLevelStep({
  action,
  itemName,
  predicted,
  reason,
  position,
  total,
  areaName,
  areaPosition,
  areaTotal,
  movedOn,
}: {
  action: (formData: FormData) => void;
  itemName: string;
  predicted: StockLevelBand;
  reason: string;
  position: number;
  total: number;
  // Where the item is kept, and how far through that area: the check goes
  // area by area, so the cleaner knows where to be standing. Null when the
  // company hasn't set areas up.
  areaName: string | null;
  areaPosition: number;
  areaTotal: number;
  // This is the first item of a new area: time to move on.
  movedOn: boolean;
}) {
  const [selected, setSelected] = useState<StockLevelBand>(predicted);
  const alternatives = BAND_ORDER.filter((b) => b !== selected);

  return (
    <form action={action} className={card("flex flex-col gap-4 p-4")}>
      <div>
        {areaName && (
          <p className="mb-2 inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
            {areaName}
            <span className="ml-2 font-normal text-white/70">
              {areaPosition} of {areaTotal}
            </span>
          </p>
        )}
        {movedOn && areaName && (
          <p className="mb-2 text-sm font-medium text-zinc-900">Now the {areaName.toLowerCase()}.</p>
        )}
        <p className="text-xs text-zinc-500">
          Stock {position} of {total}
        </p>
        <h2 className="text-sm font-medium">
          {itemName}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{reason}</p>
      </div>

      <button type="submit" name="band" value={selected} className={`w-full ${button("primary", "lg")}`}>
        Confirm: {STOCK_BAND_LABELS[selected]}
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">Not right? Tap the actual level, then confirm above.</p>
        <div className="grid grid-cols-3 gap-2">
          {alternatives.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelected(b)}
              className={button("secondary", "md")}
            >
              {STOCK_BAND_LABELS[b]}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
