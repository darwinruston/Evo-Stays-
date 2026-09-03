// Addresses can be long. Lists/tables show just the first component --
// almost always the building + street, which is what's useful at a glance.
// The full address is still shown on the property's own detail page.
export function shortAddress(address: string): string {
  const first = address.split(",")[0]?.trim();
  return first || address;
}

// What to call a property when there's no room (or need) for the full
// address — the listing name if one is set, otherwise the short address.
export function propertyDisplayName(property: { name?: string | null; address: string }): string {
  return property.name?.trim() || shortAddress(property.address);
}
