import { STOCK_BAND_LABELS, stockLevelBand, type StockLevelBand } from "@/lib/stock";

const FILLED_SEGMENTS: Record<StockLevelBand, number> = { high: 3, medium: 2, low: 1, none: 0 };

// A 3-bar meter rather than a coloured badge -- the app is strictly
// monochrome (see globals.css), so severity has to read from fill and
// weight, not colour. Same visual language as the turnover Progress bar in
// src/app/cleaner/cleans/[id]/page.tsx: filled bg-zinc-900 vs faint bg-black/10.
// "None" still renders three empty bars rather than disappearing, so a
// glance at the row tells you it was checked and found empty, not that it
// was never configured.
export function StockLevelIndicator({ level }: { level: { onHandQty: number; parQty: number } }) {
  const band = stockLevelBand(level);
  const filled = FILLED_SEGMENTS[band];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-1.5 rounded-full ${i < filled ? "bg-zinc-900" : "bg-black/10"}`}
          />
        ))}
      </span>
      <span className={`text-xs font-medium ${band === "none" ? "text-zinc-900" : "text-zinc-500"}`}>
        {STOCK_BAND_LABELS[band]}
      </span>
    </span>
  );
}
