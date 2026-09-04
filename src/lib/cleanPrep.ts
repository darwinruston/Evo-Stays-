export type CleanPrep = {
  beds: number;
  bathrooms: number;
  sofaBedNeeded: boolean;
};

// What a cleaner needs to prep for one changeover. Beds/bathrooms are just
// the property's own facts, but whether the sofa bed needs making up
// depends on this specific booking: only when its guest count runs higher
// than the bedrooms alone sleep (maxOccupancy minus what the sofa bed
// itself adds). Requires both maxOccupancy and guestCount to be known --
// with either missing there's nothing reliable to compare against, so it's
// left off rather than guessed.
export function cleanPrep(
  property: {
    bedrooms: number | null;
    bathrooms: number | null;
    maxOccupancy: number | null;
    sofaBedSleeps: number | null;
  },
  guestCount: number | null,
): CleanPrep {
  const sofaBedNeeded =
    !!property.sofaBedSleeps &&
    property.maxOccupancy !== null &&
    guestCount !== null &&
    guestCount > property.maxOccupancy - property.sofaBedSleeps;

  return {
    beds: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    sofaBedNeeded,
  };
}
