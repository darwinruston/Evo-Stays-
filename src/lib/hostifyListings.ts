import { PropertyType } from "@prisma/client";
import { decrypt } from "@/lib/encryption";

const HOSTIFY_BASE_URL = "https://api-rms.hostify.com";
const PAGE_SIZE = 100;

// Confirmed against a live account -- meaningfully richer than Hostify's
// published Listing schema, which documents only pricing/booking-settings
// fields and omits address/bedroom/bathroom data entirely. Only the fields
// this import actually uses are typed here; the real response has many more
// (pricing, house rules, per-listing users, ...) that nothing here reads.
export type HostifyListing = {
  id: number;
  name: string;
  property_type: string | null;
  street: string | null;
  city: string | null;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  person_capacity: number | null;
};

type HostifyListingsResponse =
  | { success: true; listings: HostifyListing[]; total: number }
  | { success: false; error?: string; message?: string };

// Mirrors fetchReservations in hostifySync.ts -- same pagination shape, same
// flat {success, listings, total} envelope (not nested under `data` despite
// what Hostify's docs claim), same error field ambiguity (`error` or
// `message` depending on which layer rejects the request).
export async function fetchHostifyListings(encryptedApiKey: string): Promise<HostifyListing[]> {
  const apiKey = decrypt(encryptedApiKey);
  const all: HostifyListing[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
    const res = await fetch(`${HOSTIFY_BASE_URL}/listings?${params}`, {
      headers: { "x-api-key": apiKey },
    });
    const body = (await res.json()) as HostifyListingsResponse;
    if (!res.ok || !body.success) {
      const reason = (!body.success && (body.error || body.message)) || undefined;
      throw new Error(reason || `Hostify request failed (${res.status})`);
    }

    all.push(...body.listings);
    if (all.length >= body.total || body.listings.length === 0) break;
    page++;
  }
  return all;
}

// Hostify's property_type vocabulary is broader than our simple five-value
// enum -- "Cottage" and "Apartment" are confirmed real values from a live
// account; anything unrecognised maps to OTHER rather than guessing.
const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  Apartment: PropertyType.APARTMENT,
  House: PropertyType.HOUSE,
  Studio: PropertyType.STUDIO,
  Cottage: PropertyType.COTTAGE,
};

export function mapHostifyPropertyType(raw: string | null): PropertyType {
  return (raw && PROPERTY_TYPE_MAP[raw]) || PropertyType.OTHER;
}

// Street, city, postcode -- the fields real listings on a live account
// actually had populated. Falls back to the listing's own name on the rare
// chance none of them are set, since Property.address is required.
export function buildHostifyAddress(listing: HostifyListing): string {
  const parts = [listing.street, listing.city, listing.zipcode].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : listing.name;
}

type HostifyListingPhoto = {
  photo: string; // full resolution -- what actually gets saved as the cover
  thumbnail: string;
  sort_order: number;
};

type HostifyListingPhotosResponse =
  | { success: true; listingId: number; photos: HostifyListingPhoto[] }
  | { success: false; error?: string; message?: string };

// The listing's designated cover photo (lowest sort_order), full resolution
// -- confirmed against a live account, a genuinely separate endpoint from
// GET /listings itself. Only called per selected listing at import time
// (not for every listing shown in the picker, which doesn't need images),
// and only the cover -- the full gallery this same endpoint returns isn't
// what was asked for. Returns null rather than throwing on any failure
// (no photos, request error, whatever) -- a missing cover photo shouldn't
// stop the property itself from importing; see importHostifyListings.
export async function fetchHostifyCoverPhotoUrl(
  encryptedApiKey: string,
  listingId: number,
): Promise<string | null> {
  try {
    const apiKey = decrypt(encryptedApiKey);
    const res = await fetch(`${HOSTIFY_BASE_URL}/listings/photos/${listingId}`, {
      headers: { "x-api-key": apiKey },
    });
    const body = (await res.json()) as HostifyListingPhotosResponse;
    if (!res.ok || !body.success || body.photos.length === 0) return null;
    const cover = [...body.photos].sort((a, b) => a.sort_order - b.sort_order)[0];
    return cover.photo;
  } catch {
    return null;
  }
}
