import { knownNoDishwasher, type PropertyAmenities } from "@/lib/amenities";

// Stock that only makes sense with a dishwasher, recognised by its name so
// nobody has to mark items up: rinse aid, dishwasher salt, dishwasher or
// washing tablets and the like. Washing-up liquid is for washing by hand, and
// anything for laundry belongs to the washing machine, so neither counts.
const DISHWASHER_STOCK =
  /dish\s?washer|rinse[\s-]?aid|\bdish(washing)?\s(tablets?|tabs?|pods?|salt)\b|\bwashing\s(tablets?|tabs?)\b/i;
const FOR_LAUNDRY = /laundry|washing machine|clothes/i;

export function isDishwasherStock(name: string): boolean {
  return DISHWASHER_STOCK.test(name) && !FOR_LAUNDRY.test(name);
}

// Whether a stock item belongs at this property. Only ruled out when the
// property is known to have no dishwasher: with nothing recorded about it,
// everything is allowed.
export function stockSuits(itemName: string, property: PropertyAmenities): boolean {
  return !(isDishwasherStock(itemName) && knownNoDishwasher(property));
}
