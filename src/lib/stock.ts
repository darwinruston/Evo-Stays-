import type { StockLevelBand as PrismaStockLevelBand } from "@prisma/client";

// Lowercase everywhere in the app (buttons, form field values, labels) --
// this type predates having a real database column behind it, and every
// cleaner-facing component (StockLevelToggle, StockLevelStep) already reads
// and writes these exact strings. The Prisma column is SCREAMING_CASE, the
// one convention every other enum in this schema uses, so the two are
// bridged at the database boundary (bandToDb/bandFromDb below) rather than
// changing either side to match the other.
export type StockLevelBand = "high" | "medium" | "low" | "none";

export const STOCK_BAND_LABELS: Record<StockLevelBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const STOCK_BANDS: StockLevelBand[] = ["high", "medium", "low", "none"];

export function isStockLevelBand(value: unknown): value is StockLevelBand {
  return typeof value === "string" && (STOCK_BANDS as string[]).includes(value);
}

export function bandToDb(band: StockLevelBand): PrismaStockLevelBand {
  return band.toUpperCase() as PrismaStockLevelBand;
}

export function bandFromDb(band: PrismaStockLevelBand): StockLevelBand {
  return band.toLowerCase() as StockLevelBand;
}

// The two bands that actually need attention -- for list filtering and
// dashboard counts.
export function isRunningLow(level: { band: PrismaStockLevelBand }): boolean {
  return level.band === "LOW" || level.band === "NONE";
}
