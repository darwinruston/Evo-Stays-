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
