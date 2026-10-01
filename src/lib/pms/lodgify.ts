import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Lodgify's published API reference (docs.lodgify.com) with no
// live account to test against -- see the comments below for the specific
// judgment calls made along the way. Follows the never-throws,
// record-your-own-error contract src/lib/pms/sync.ts expects of every
// adapter, same as src/lib/pms/hostify.ts.

const BASE_URL = "https://api.lodgify.com";
const PAGE_SIZE = 50; // Lodgify's documented max per page

function apiKeyOf(credentials: PmsCredentials): string {
  const apiKey = credentials.apiKey;
  if (!apiKey) throw new Error("No Lodgify API key configured on this client.");
  return apiKey;
}

async function lodgifyGet<T>(path: string, params: URLSearchParams, apiKey: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { "X-ApiKey": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Lodgify request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

type LodgifyProperty = {
  id: number;
  name: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LodgifyPropertiesResponse = { count: number | null; items: LodgifyProperty[] | null };

function buildAddress(property: LodgifyProperty): string {
  if (property.address && property.address.trim() !== "") return property.address;
  const parts = [property.city, property.zip, property.country].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : property.name || "";
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const apiKey = apiKeyOf(credentials);
  const all: LodgifyProperty[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), includeCount: "true" });
    const body = await lodgifyGet<LodgifyPropertiesResponse>("/v2/properties", params, apiKey);
    const items = body.items ?? [];
    all.push(...items);
    if (items.length < PAGE_SIZE || (body.count !== null && all.length >= body.count)) break;
    page++;
  }

  return all.map((property) => ({
    externalId: String(property.id),
    name: property.name,
    address: buildAddress(property),
    latitude: property.latitude,
    longitude: property.longitude,
    // Lodgify's v2 property object has no property-type field at all (only
    // a `rooms` list of named room *types*, not a dwelling type) -- mapped
    // to OTHER rather than guessing. Same reasoning for bedrooms/bathrooms/
    // maxOccupancy below: none of them appear on this endpoint's response,
    // only room-type names, so they're left null for staff to fill in by
    // hand after import, same as any manually-added property.
    propertyType: "OTHER",
    bedrooms: null,
    bathrooms: null,
    maxOccupancy: null,
  }));
}

type LodgifyGuestBreakdown = { people: number | null };

type LodgifyBooking = {
  id: number;
  property_id: number;
  arrival: string;
  departure: string;
  status: string;
  canceled_at: string | null;
  guest_breakdown: LodgifyGuestBreakdown | null;
};

type LodgifyBookingsResponse = { count: number | null; items: LodgifyBooking[] | null };

// Booked is the one clearly-confirmed status; an explicit canceled_at
// timestamp (or status Declined) means cancelled regardless of the status
// value otherwise; Open and Tentative fall through to "pending", same
// never-creates-or-cancels-on-its-own fallback src/lib/pms/hostify.ts uses
// for any status it doesn't specifically recognise.
function outcomeFor(status: string, canceledAt: string | null): PmsReservationOutcome {
  if (canceledAt !== null || status === "Declined") return "cancelled";
  if (status === "Booked") return "active";
  return "pending";
}

// Lodgify's List of bookings endpoint (confirmed against its documented
// query parameters) has no property-id filter -- only page/size/stayFilter/
// stayFilterDate/updatedSince/trash. Every non-trashed booking on the whole
// account is fetched and filtered to this listing client-side, which is
// wasteful for a large multi-property portfolio but the only option the
// documented API offers. startDate/endDate aren't passed upstream either,
// for the same reason stayFilterDate only accepts one date, not a range --
// src/lib/pms/sync.ts re-checks the horizon cutoff on every reservation
// regardless (see its own comment on that), so this is a correctness no-op,
// just a slower one than the other adapters' server-side date filtering.
async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  // Accepted for parity with every other adapter's fetchReservations
  // signature, unused here -- see the comment above on why Lodgify can't
  // filter server-side by date the way the others do.
  void startDate;
  void endDate;

  const apiKey = apiKeyOf(credentials);
  const all: LodgifyBooking[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      includeCount: "true",
      stayFilter: "All",
      trash: "False",
    });
    const body = await lodgifyGet<LodgifyBookingsResponse>("/v2/reservations/bookings", params, apiKey);
    const items = body.items ?? [];
    all.push(...items);
    if (items.length < PAGE_SIZE || (body.count !== null && all.length >= body.count)) break;
    page++;
  }

  return all
    .filter((b) => String(b.property_id) === listingId)
    .map((b) => ({
      externalId: String(b.id),
      checkIn: new Date(b.arrival),
      checkOut: new Date(b.departure),
      // guest_breakdown.people is documented as deprecated in favour of a
      // per-type (adults/children/...) breakdown not otherwise captured
      // here -- kept as a best-effort total since it's still populated on
      // real responses, not removed outright.
      guests: b.guest_breakdown?.people ?? null,
      status: b.status,
      outcome: outcomeFor(b.status, b.canceled_at),
    }));
}

export const lodgifyAdapter: PmsAdapter = {
  provider: "LODGIFY",
  displayName: "Lodgify",
  credentialFields: [
    { key: "apiKey", label: "Lodgify API key", helpText: "From Lodgify → Settings → Public API." },
  ],
  listListings,
  fetchReservations,
};
