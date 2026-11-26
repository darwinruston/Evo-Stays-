// What a property has in it. The booking system's own list is stored as it is
// sent (Property.amenities). On top of that, the ones that matter for cleaning
// and looking after a property can be corrected by staff, because listings are
// often incomplete or out of date. Pure functions, safe anywhere.

export type KeyAmenity = {
  id: string;
  label: string;
  // The names booking systems use for it, lower case. Exact names, not "contains":
  // "washer" must not match "dishwasher", nor "dryer" match "hair dryer".
  names: string[];
};

export const KEY_AMENITIES: KeyAmenity[] = [
  { id: "dishwasher", label: "Dishwasher", names: ["dishwasher"] },
  { id: "washing-machine", label: "Washing machine", names: ["washer", "washing machine", "washer dryer", "washer on property"] },
  { id: "tumble-dryer", label: "Tumble dryer", names: ["dryer", "tumble dryer", "washer dryer", "dryer on property"] },
  { id: "oven", label: "Oven", names: ["oven"] },
  { id: "microwave", label: "Microwave", names: ["microwave"] },
  { id: "fridge", label: "Fridge", names: ["refrigerator", "fridge", "fridge / freezer"] },
  { id: "freezer", label: "Freezer", names: ["freezer", "fridge / freezer"] },
  { id: "kettle", label: "Kettle", names: ["kettle", "electric kettle"] },
  { id: "toaster", label: "Toaster", names: ["toaster"] },
  { id: "coffee-machine", label: "Coffee machine", names: ["coffee maker", "coffee machine", "espresso-machine"] },
  { id: "bath", label: "Bath", names: ["bathtub", "bath with shower"] },
  { id: "hair-dryer", label: "Hair dryer", names: ["hair dryer"] },
  { id: "iron", label: "Iron", names: ["iron"] },
  { id: "hot-tub", label: "Hot tub", names: ["hot tub", "private hot tub", "jacuzzi"] },
  { id: "bbq", label: "BBQ", names: ["bbq grill", "bbq", "barbecue"] },
  { id: "fireplace", label: "Fireplace", names: ["indoor fireplace", "fireplace"] },
  { id: "garden", label: "Garden", names: ["garden or backyard", "garden", "backyard"] },
  { id: "balcony", label: "Patio or balcony", names: ["patio or balcony", "patio", "balcony", "terrace"] },
  {
    id: "parking",
    label: "Parking",
    names: ["parking", "free parking on premises", "free parking with garage", "private parking", "underground parking"],
  },
  { id: "lift", label: "Lift", names: ["elevator in building", "elevator", "lift"] }, // spelling-ok: what booking systems send
  { id: "ev-charger", label: "EV charger", names: ["ev charger"] },
];

export type PropertyAmenities = {
  amenities: string[];
  amenitiesSyncedAt: Date | null;
  amenitiesCheckedAt: Date | null;
  amenityAdded: string[];
  amenityRemoved: string[];
};

export function listedByBookingSystem(listed: string[], amenity: KeyAmenity): boolean {
  return listed.some((name) => amenity.names.includes(name.trim().toLowerCase()));
}

// Whether the property has it, taking staff corrections over the listing.
export function hasAmenity(property: PropertyAmenities, amenity: KeyAmenity): boolean {
  if (property.amenityRemoved.includes(amenity.id)) return false;
  if (property.amenityAdded.includes(amenity.id)) return true;
  return listedByBookingSystem(property.amenities, amenity);
}

// Whether anything is actually known: a listing that sent amenities, or staff
// having saved the tick boxes. Without either, "not ticked" means nothing, so
// nothing should be taken away on the strength of it.
export function amenitiesKnown(property: PropertyAmenities): boolean {
  return property.amenities.length > 0 || property.amenitiesCheckedAt !== null;
}

export function presentKeyAmenities(property: PropertyAmenities): KeyAmenity[] {
  return KEY_AMENITIES.filter((a) => hasAmenity(property, a));
}

// True only when it is known that there is no dishwasher.
export function knownNoDishwasher(property: PropertyAmenities): boolean {
  return amenitiesKnown(property) && !hasAmenity(property, KEY_AMENITIES[0]);
}

// Turns the ticked boxes into corrections: only where they differ from what the
// listing says, so a later change to the listing still comes through for the
// ones staff agreed with.
export function correctionsFrom(listed: string[], ticked: Set<string>) {
  return {
    amenityAdded: KEY_AMENITIES.filter((a) => ticked.has(a.id) && !listedByBookingSystem(listed, a)).map((a) => a.id),
    amenityRemoved: KEY_AMENITIES.filter((a) => !ticked.has(a.id) && listedByBookingSystem(listed, a)).map((a) => a.id),
  };
}
