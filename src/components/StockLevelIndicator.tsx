import { STOCK_BAND_LABELS, type StockLevelBand } from "@/lib/stock";

const FILLED_SEGMENTS: Record<StockLevelBand, number> = { high: 3, medium: 2, low: 1, none: 0 };

// Three dots: how many are filled says the level, and the colour says it again
// at a glance. "None" still shows three empty dots rather than disappearing, so
// you can see it was checked and found empty, not never set up.
const FILL: Record<StockLevelBand, string> = { high: "bg-emerald-500", medium: "bg-amber-400", low: "bg-rose-500", none: "bg-rose-500" };

export function StockLevelIndicator({ band, compact = false }: { band: StockLevelBand; compact?: boolean }) {
  const filled = FILLED_SEGMENTS[band];

  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} rounded-full ${i < filled ? FILL[band] : "bg-black/10"}`}
          />
        ))}
      </span>
      {!compact && (
        <span className={`text-sm font-semibold ${band === "none" ? "text-rose-700" : "text-zinc-600"}`}>
          {STOCK_BAND_LABELS[band]}
        </span>
      )}
    </span>
  );
}
