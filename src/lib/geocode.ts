import type { LatLng } from "@/lib/linenRoute";

// A UK postcode anywhere in an address: "E1W 1NJ", "S32 1AJ", "SW1A1AA".
const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

export function extractUkPostcode(address: string): string | null {
  const match = UK_POSTCODE.exec(address);
  return match ? `${match[1]} ${match[2]}`.toUpperCase() : null;
}

// Finds an address on the map from its UK postcode, using postcodes.io: free
// and needs no account or key. Good to the street or so, which is plenty
// for estimating drive times between properties. Returns null for anything
// without a postcode, an unknown postcode, or any network trouble: a missing
// position only makes the route plan more cautious, it never breaks it.
export async function geocodeUkAddress(address: string): Promise<LatLng | null> {
  const postcode = extractUkPostcode(address);
  if (!postcode) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: { latitude?: number | null; longitude?: number | null } };
    const lat = body.result?.latitude;
    const lng = body.result?.longitude;
    return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
  } catch {
    return null;
  }
}
