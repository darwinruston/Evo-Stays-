// Addresses can be long. Lists/tables show just the first component --
// almost always the building + street, which is what's useful at a glance.
// The full address is still shown on the property's own detail page.
export function shortAddress(address: string): string {
  const first = address.split(",")[0]?.trim();
  return first || address;
}

// What to call a property when there's no room (or need) for the full
// address -- the internal nickname staff and cleaners actually recognise it
// by, if one's set; the listing name (often synced straight from Hostify)
// otherwise; the short address if neither is set. Every clean, notification,
// and list row runs through this one function, so setting a nickname is
// what makes it "what they see when clean tasks are made" everywhere at
// once -- but only on a query that actually selected `nickname`; one that
// didn't just falls back to `name` exactly as before.
export function propertyDisplayName(property: {
  nickname?: string | null;
  name?: string | null;
  address: string;
}): string {
  return property.nickname?.trim() || property.name?.trim() || shortAddress(property.address);
}

// Both names, nickname first ("Riverside · Bright 2-bed loft by the river"),
// for places where someone is matching a property against the booking system,
// such as giving it to a cleaner. Just the one name where there is no
// nickname, or the two are the same.
export function propertyFullName(property: {
  nickname?: string | null;
  name?: string | null;
  address: string;
}): string {
  const nickname = property.nickname?.trim();
  const listing = property.name?.trim();
  if (nickname && listing && nickname !== listing) return `${nickname} · ${listing}`;
  return propertyDisplayName(property);
}
