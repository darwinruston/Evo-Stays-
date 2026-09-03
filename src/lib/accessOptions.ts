// How the cleaner actually gets in. Short-let specific: most turnovers are
// unattended, so key safes and keypads matter more than gates and driveways.
//
// Shared between the (client) picker and the (server) read-only display --
// must stay free of "use client" so server components can import it.

export const ACCESS_OPTIONS = [
  { value: "KEY_SAFE", label: "Key safe" },
  { value: "LOCKBOX", label: "Lockbox" },
  { value: "SMART_LOCK", label: "Smart lock / keypad" },
  { value: "COMMUNAL_ENTRANCE", label: "Communal entrance" },
  { value: "CONCIERGE", label: "Concierge / reception" },
  { value: "LIFT", label: "Lift access" },
  { value: "STAIRS_ONLY", label: "Stairs only" },
  { value: "PARKING_ON_SITE", label: "Parking on site" },
  { value: "KEYS_FROM_OFFICE", label: "Keys held at the office" },
] as const;

export const ACCESS_OPTION_LABELS: Record<string, string> = Object.fromEntries(
  ACCESS_OPTIONS.map((o) => [o.value, o.label]),
);

export function parseAccessOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  STUDIO: "Studio",
  COTTAGE: "Cottage",
  OTHER: "Other",
};
