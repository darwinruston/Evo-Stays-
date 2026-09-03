export type StockLevelBand = "high" | "medium" | "low" | "none";

export const STOCK_BAND_LABELS: Record<StockLevelBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

// A 4-band read rather than a single "running low" cutoff -- "5 out of 6"
// and "1 out of 6" were both just "Running low" before, which told staff
// nothing about how urgent it was. Bands are thirds of par: at/above two
// thirds reads as comfortably stocked, below a third as needing attention
// soon, and zero is its own band since running out entirely is a different
// situation to being merely low.
export function stockLevelBand(level: { onHandQty: number; parQty: number }): StockLevelBand {
  if (level.onHandQty <= 0) return "none";
  const ratio = level.onHandQty / level.parQty;
  if (ratio >= 2 / 3) return "high";
  if (ratio >= 1 / 3) return "medium";
  return "low";
}

// For list filtering and dashboard counts: the two bands that actually need
// attention. Derived from the same band function as the on-screen indicator,
// so a property never counts as "needing attention" in one place and reads
// as fine in another.
export function isRunningLow(level: { onHandQty: number; parQty: number }): boolean {
  const band = stockLevelBand(level);
  return band === "low" || band === "none";
}

// The inverse of stockLevelBand: a representative on-hand figure for a band
// a cleaner tapped, since PropertyStockLevel still needs a number underneath
// (admin's numeric editor, the dashboard tile, the low-stock list all read
// onHandQty directly). "High" maps to full par; "none" to zero; "low" and
// "medium" are found by scanning for an integer that actually round-trips
// back through stockLevelBand to the requested band, rather than an
// independent formula that could disagree with it at small par quantities
// (a par of 2 or 3 doesn't cleanly split into thirds).
export function bandToOnHandQty(band: StockLevelBand, parQty: number): number {
  if (band === "none") return 0;
  if (band === "high") return parQty;

  const start = band === "low" ? 1 : Math.ceil(parQty / 3);
  for (let qty = start; qty < parQty; qty++) {
    if (stockLevelBand({ onHandQty: qty, parQty }) === band) return qty;
  }
  // parQty too small to have a distinct value for this band (e.g. par 1 or
  // 2) -- nearest sensible fallback rather than a value stockLevelBand would
  // just reclassify into a different band.
  return band === "low" ? 1 : Math.max(1, Math.round(parQty / 2));
}
