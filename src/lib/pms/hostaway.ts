import { PmsAuthError } from "@/lib/pms/errors";
import { requestClientCredentialsToken } from "@/lib/pms/oauth";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Hostaway's published API reference (api.hostaway.com/documentation)
// with no live account to test against -- see the credentialFields helpText
// and the comments below for the specific judgment calls made along the way.
// Follows the never-throws, record-your-own-error contract src/lib/pms/sync.ts
// expects of every adapter, same as src/lib/pms/hostify.ts.

const BASE_URL = "https://api.hostaway.com/v1";
const PAGE_SIZE = 100;

async function getToken(credentials: PmsCredentials): Promise<string> {
  const accountId = credentials.accountId;
  const apiKey = credentials.apiKey;
  if (!accountId || !apiKey) throw new Error("No Hostaway Account ID / API key configured on this client.");

  // No caching -- unlike Guesty, Hostaway's token is valid 24 months with no
  // documented limit on how many can be minted, so a fresh one per call
  // costs an extra round trip but nothing else.
  const { token } = await requestClientCredentialsToken({
    url: `${BASE_URL}/accessTokens`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: accountId,
      client_secret: apiKey,
      scope: "general",
    }),
    providerName: "Hostaway",
  });
  return token;
}

function isoDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type HostawayEnvelope<T> =
  | { status: "success"; result: T[]; count: number }
  | { status: "fail" | "error"; message?: string };

async function hostawayGet<T>(path: string, params: URLSearchParams, token: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    const res = await fetch(`${BASE_URL}${path}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = (await res.json()) as HostawayEnvelope<T>;
    if (!res.ok || body.status !== "success") {
      const reason = body.status !== "success" ? body.message : undefined;
      if (res.status === 401 || res.status === 403) throw new PmsAuthError(reason || `rejected, ${res.status}`);
      throw new Error(reason || `Hostaway request failed (${res.status})`);
    }
    all.push(...body.result);
    if (body.result.length < PAGE_SIZE || all.length >= body.count) break;
    offset += PAGE_SIZE;
  }
  return all;
}

type HostawayListing = {
  id: number;
  name: string;
  address: string | null;
  street: string | null;
  city: string | null;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  bedroomsNumber: number | null;
  bathroomsNumber: number | null;
  personCapacity: number | null;
};

function buildAddress(listing: HostawayListing): string {
  const parts = [listing.street, listing.city, listing.zipcode].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  if (parts.length > 0) return parts.join(", ");
  return listing.address || listing.name;
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const token = await getToken(credentials);
  const listings = await hostawayGet<HostawayListing>("/listings", new URLSearchParams(), token);

  return listings.map((listing) => ({
    externalId: String(listing.id),
    name: listing.name,
    address: buildAddress(listing),
    latitude: listing.lat,
    longitude: listing.lng,
    // Hostaway's propertyTypeId is an opaque integer referencing a lookup
    // table that isn't included on the listing itself and has no documented
    // public endpoint -- mapped to OTHER rather than guessing at what each
    // id means.
    propertyType: "OTHER",
    bedrooms: listing.bedroomsNumber === null ? null : Math.round(listing.bedroomsNumber),
    bathrooms: listing.bathroomsNumber === null ? null : Math.round(listing.bathroomsNumber),
    maxOccupancy: listing.personCapacity === null ? null : Math.round(listing.personCapacity),
  }));
}

type HostawayReservation = {
  id: number;
  listingMapId: number;
  arrivalDate: string;
  departureDate: string;
  numberOfGuests: number | null;
  status: string;
};

// "new"/"modified"/"ownerStay" all genuinely block the calendar (an owner
// staying personally still needs a clean once they leave); "cancelled"
// clearly doesn't. Everything else (inquiry, pending, awaitingPayment,
// unconfirmed -- none of them guaranteed to ever become a real stay) falls
// through to "pending", same never-creates-or-cancels-on-its-own fallback
// src/lib/pms/hostify.ts uses for any status it doesn't specifically
// recognise. See https://support.hostaway.com/hc/en-us/articles/360002561274.
const ACTIVE_STATUSES = new Set(["new", "modified", "ownerStay"]);
const CANCELLED_STATUSES = new Set(["cancelled"]);

function outcomeFor(status: string): PmsReservationOutcome {
  if (ACTIVE_STATUSES.has(status)) return "active";
  if (CANCELLED_STATUSES.has(status)) return "cancelled";
  return "pending";
}

async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const token = await getToken(credentials);
  // listingMapId as the filter param name mirrors the reservation object's
  // own field of the same name -- not explicitly spelled out as a filter
  // parameter in the documentation excerpt available while building this,
  // so worth double-checking first if Hostaway sync ever looks like it's
  // returning every listing's reservations instead of just this one's.
  const params = new URLSearchParams({
    listingMapId: listingId,
    dateType: "departureDate",
    startDate: isoDateParam(startDate),
  });
  if (endDate) params.set("endDate", isoDateParam(endDate));

  const reservations = await hostawayGet<HostawayReservation>("/reservations", params, token);

  return reservations.map((r) => ({
    externalId: String(r.id),
    checkIn: new Date(r.arrivalDate),
    checkOut: new Date(r.departureDate),
    guests: r.numberOfGuests,
    status: r.status,
    outcome: outcomeFor(r.status),
  }));
}

export const hostawayAdapter: PmsAdapter = {
  provider: "HOSTAWAY",
  displayName: "Hostaway",
  credentialFields: [
    { key: "accountId", label: "Account ID", helpText: "From Hostaway → Settings → Hostaway API." },
    { key: "apiKey", label: "API key", helpText: "Generated on the same page, next to the Account ID." },
  ],
  listListings,
  fetchReservations,
};
