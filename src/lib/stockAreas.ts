// Stock is kept in places (the kitchen, the kitchen cupboard, the bathroom), and
// a cleaner should go through one place and then the next, not back and forth.
// Each item has one area; the areas have an order (their position), which is
// the order a cleaner walks through them. An item with no area comes last.
//
// Something that lives in two places, like hand soap, is two items, one for
// each place ("Hand soap (kitchen)", "Hand soap (bathroom)"): they are counted
// separately anyway.

export const MAX_STOCK_AREA_NAME = 40;

// What the "Add the usual areas" button creates, in walking order.
export const DEFAULT_STOCK_AREAS = [
  "Kitchen",
  "Kitchen cupboard",
  "Bathroom",
  "Bedroom",
  "Living area",
  "Store cupboard",
];

export type AreaRef = { id: string; name: string; position: number } | null;

// Area order first (no area last), then the item's name, so the order is the
// same every time and easy to find your place in.
export function compareByArea(
  a: { name: string; area: AreaRef },
  b: { name: string; area: AreaRef },
): number {
  const aPos = a.area ? a.area.position : Number.MAX_SAFE_INTEGER;
  const bPos = b.area ? b.area.position : Number.MAX_SAFE_INTEGER;
  if (aPos !== bPos) return aPos - bPos;
  return a.name.localeCompare(b.name);
}

// Sorts anything that carries a stock item, by area then name.
export function sortByStockArea<T>(rows: T[], itemOf: (row: T) => { name: string; area: AreaRef }): T[] {
  return [...rows].sort((a, b) => compareByArea(itemOf(a), itemOf(b)));
}

// Splits an already-sorted list into runs by area, in order, for headings.
// Items with no area share one run at the end (area null).
export function groupByStockArea<T>(
  rows: T[],
  itemOf: (row: T) => { name: string; area: AreaRef },
): { area: AreaRef; rows: T[] }[] {
  const groups: { area: AreaRef; rows: T[] }[] = [];
  for (const row of sortByStockArea(rows, itemOf)) {
    const area = itemOf(row).area;
    const last = groups[groups.length - 1];
    if (last && (last.area?.id ?? null) === (area?.id ?? null)) last.rows.push(row);
    else groups.push({ area, rows: [row] });
  }
  return groups;
}
