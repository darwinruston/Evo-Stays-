import { PropertyType } from "@prisma/client";
import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

const HOSTIFY_BASE_URL = "https://api-rms.hostify.com";
const PAGE_SIZE = 100;

function apiKeyOf(credentials: PmsCredentials): string {
  const apiKey = credentials.apiKey;
  if (!apiKey) throw new Error("No Hostify API key configured on this client.");
  return apiKey;
}

// Field names confirmed against a live response -- Hostify's own OpenAPI
// schema documents snake_case check_in/check_out, but the real API returns
// camelCase checkIn/checkOut.
type HostifyReservation = {
  id: number;
  listing_id: number;
  checkIn: string;
  checkOut: string;
  guests: number | null;
  status: string;
};

// The real API returns reservations/total flat at the top level -- despite
// Hostify's own published OpenAPI schema (and its docs page's generic
// "Response Format" example) showing them nested under a `data` object.
// Confirmed directly against a live account rather than trusted from docs
// that turned out not to match actual behaviour. A failure can name the
// problem via either `error` or `message` depending on which layer rejects
// the request (confirmed `error` on a 403 scope rejection).
type HostifyReservationsResponse =
  | { success: true; reservations: HostifyReservation[]; total: number }
  | { success: false; error?: string; message?: string };

function isoDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Confirmed against a live account: the real status value is simply
// "cancelled" -- Hostify's own OpenAPI schema instead documents an enum of
// "denied"/"cancelled_by_host"/"cancelled_by_guest"/"no_show", none of which
// actually occur. Kept those documented variants alongside the real one in
// case a different account or a future Hostify version does use them --
// costs nothing to also recognize, and the alternative (trusting the docs
// alone) is exactly what missed the real value the first time.
const CANCELLED_STATUSES = new Set([
  "cancelled",
  "denied",
  "cancelled_by_host",
  "cancelled_by_guest",
  "no_show",
]);

// "pending" is also the fallback for any status Hostify might add later --
// tracked, but never creates or cancels a Clean on its own, so an
// unrecognized value can't silently do either.
function outcomeFor(status: string): PmsReservationOutcome {
  if (status === "accepted") return "active";
  if (CANCELLED_STATUSES.has(status)) return "cancelled";
  return "pending";
}

// Hostify's own docs don't pin down whether start_date/end_date filter by
// check-in, check-out, or booking-creation date -- so this passes them as a
// best-effort narrowing, but src/lib/pms/sync.ts still re-checks the horizon
// cutoff itself on every reservation, same defensive belt-and-braces the
// iCal sync path already relies on.
async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const apiKey = apiKeyOf(credentials);
  const all: HostifyReservation[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      listing_id: listingId,
      // Booking.com (and possibly other channels) can map a property to a
      // "child" listing under our own -- confirmed by Hostify support after
      // a real reservation only turned up once this was added. Without it,
      // a reservation booked against the child never appears against the
      // parent listing_id we sync on, silently dropping that channel's
      // bookings while every other channel (booked directly on the parent)
      // keeps working -- exactly what made this so easy to miss.
      withChildren: "1",
      start_date: isoDateParam(startDate),
      page: String(page),
      per_page: String(PAGE_SIZE),
    });
    if (endDate) params.set("end_date", isoDateParam(endDate));

    const res = await fetch(`${HOSTIFY_BASE_URL}/reservations?${params}`, {
      headers: { "x-api-key": apiKey },
    });
    const body = (await res.json()) as HostifyReservationsResponse;
    if (!res.ok || !body.success) {
      const reason = (!body.success && (body.error || body.message)) || undefined;
      if (res.status === 401 || res.status === 403) {
        throw new PmsAuthError(reason || `rejected, ${res.status}`);
      }
      throw new Error(reason || `Hostify request failed (${res.status})`);
    }

    all.push(...body.reservations);
    if (all.length >= body.total || body.reservations.length === 0) break;
    page++;
  }

  return all.map((r) => ({
    externalId: String(r.id),
    checkIn: new Date(r.checkIn),
    checkOut: new Date(r.checkOut),
    guests: r.guests,
    status: r.status,
    outcome: outcomeFor(r.status),
  }));
}

// Confirmed against a live account -- meaningfully richer than Hostify's
// published Listing schema, which documents only pricing/booking-settings
// fields and omits address/bedroom/bathroom data entirely. Only the fields
// this import actually uses are typed here; the real response has many more
// (pricing, house rules, per-listing users, ...) that nothing here reads.
type HostifyListing = {
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

// Hostify's property_type vocabulary is broader than our simple five-value
// enum -- "Cottage" and "Apartment" are confirmed real values from a live
// account; anything unrecognised maps to OTHER rather than guessing.
const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  Apartment: PropertyType.APARTMENT,
  House: PropertyType.HOUSE,
  Studio: PropertyType.STUDIO,
  Cottage: PropertyType.COTTAGE,
};

function mapPropertyType(raw: string | null): PmsListing["propertyType"] {
  return (raw && PROPERTY_TYPE_MAP[raw]) || PropertyType.OTHER;
}

// Street, city, postcode -- the fields real listings on a live account
// actually had populated. Falls back to the listing's own name on the rare
// chance none of them are set, since Property.address is required.
function buildAddress(listing: HostifyListing): string {
  const parts = [listing.street, listing.city, listing.zipcode].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : listing.name;
}

// Mirrors fetchReservations above -- same pagination shape, same flat
// {success, listings, total} envelope (not nested under `data` despite what
// Hostify's docs claim), same error field ambiguity (`error` or `message`
// depending on which layer rejects the request).
async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const apiKey = apiKeyOf(credentials);
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
      if (res.status === 401 || res.status === 403) {
        throw new PmsAuthError(reason || `rejected, ${res.status}`);
      }
      throw new Error(reason || `Hostify request failed (${res.status})`);
    }

    all.push(...body.listings);
    if (all.length >= body.total || body.listings.length === 0) break;
    page++;
  }

  return all.map((listing) => ({
    externalId: String(listing.id),
    name: listing.name,
    address: buildAddress(listing),
    latitude: listing.lat,
    longitude: listing.lng,
    propertyType: mapPropertyType(listing.property_type),
    bedrooms: listing.bedrooms === null ? null : Math.round(listing.bedrooms),
    bathrooms: listing.bathrooms === null ? null : Math.round(listing.bathrooms),
    maxOccupancy: listing.person_capacity === null ? null : Math.round(listing.person_capacity),
  }));
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
// what was asked for. Returns null rather than throwing on any failure (no
// photos, request error, whatever) -- a missing cover photo shouldn't stop
// the property itself from importing; see importPmsListings.
async function fetchCoverPhotoUrl(credentials: PmsCredentials, listingId: string): Promise<string | null> {
  try {
    const apiKey = apiKeyOf(credentials);
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

export const hostifyAdapter: PmsAdapter = {
  provider: "HOSTIFY",
  displayName: "Hostify",
  credentialFields: [
    {
      key: "apiKey",
      label: "Hostify API key",
      helpText: 'From Hostify → Settings → API Keys. Only needs the "reservations:read_no_guest" scope.',
    },
  ],
  listListings,
  fetchReservations,
  fetchCoverPhotoUrl,
};
