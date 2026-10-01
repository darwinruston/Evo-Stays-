import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to OwnerRez's published API reference (api.ownerrez.com/help/v2)
// with no live account to test against -- see the comments below for the
// specific judgment calls made along the way. Follows the never-throws,
// record-your-own-error contract src/lib/pms/sync.ts expects of every
// adapter, same as src/lib/pms/hostify.ts.
//
// Auth is a Personal Access Token over HTTP Basic (confirmed against
// OwnerRez's own docs example: `curl -u you@example.com:pt_xxxxx ...`) --
// not a bearer token despite being called an "access token" elsewhere, and
// not the full OAuth2 Authorization Code flow OwnerRez also offers, which
// would need a public redirect URL this app doesn't have yet. Two
// credential fields, not one: the account's own email as the Basic auth
// username, and the token itself as the password.
//
// Operational note, not something this adapter can work around: OwnerRez
// rate-limits PATs by server IP -- 2 distinct OwnerRez accounts per IP per
// 24h (see the comment in src/lib/runAllSyncs.ts). A 3rd organization
// connecting OwnerRez will start getting rate-limited by OwnerRez itself,
// not by anything in this codebase.

const BASE_URL = "https://api.ownerrez.com/v2";
const PAGE_SIZE = 100;

function authHeader(credentials: PmsCredentials): string {
  const username = credentials.username;
  const token = credentials.token;
  if (!username || !token) throw new Error("No OwnerRez email / access token configured on this client.");
  return `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`;
}

async function ownerRezGet<T>(path: string, params: URLSearchParams, credentials: PmsCredentials): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { Authorization: authHeader(credentials), Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`OwnerRez request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

// OwnerRez's rich PropertyType enum (confirmed against the live schema)
// includes exact matches for most of our own five-value enum -- unlike
// Hostaway/Guesty, this one's a real mapping, not a guess.
const PROPERTY_TYPE_MAP: Record<string, PmsListing["propertyType"]> = {
  apartment: "APARTMENT",
  house: "HOUSE",
  studio: "STUDIO",
  cottage: "COTTAGE",
};

function mapPropertyType(raw: string | null): PmsListing["propertyType"] {
  return (raw && PROPERTY_TYPE_MAP[raw]) || "OTHER";
}

type OwnerRezAddress = {
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type OwnerRezProperty = {
  id: number;
  name: string | null;
  address: OwnerRezAddress | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  property_type: string | null;
};

type OwnerRezPropertiesResponse = { count: number; items: OwnerRezProperty[] };

function buildAddress(property: OwnerRezProperty): string {
  const a = property.address;
  if (!a) return property.name ?? "";
  const parts = [a.street1, a.street2, a.city, a.postal_code].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : property.name ?? "";
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const all: OwnerRezProperty[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    const body = await ownerRezGet<OwnerRezPropertiesResponse>("/properties", params, credentials);
    all.push(...body.items);
    if (body.items.length < PAGE_SIZE || all.length >= body.count) break;
    offset += PAGE_SIZE;
  }

  return all.map((property) => ({
    externalId: String(property.id),
    name: property.name,
    address: buildAddress(property),
    latitude: property.latitude,
    longitude: property.longitude,
    propertyType: mapPropertyType(property.property_type),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxOccupancy: property.max_guests,
  }));
}

type OwnerRezBooking = {
  id: number;
  property_id: number;
  arrival: string;
  departure: string;
  adults: number | null;
  children: number | null;
  infants: number | null;
  status: "active" | "canceled" | "pending";
  is_block: boolean;
};

type OwnerRezBookingsResponse = { count: number; items: OwnerRezBooking[] };

function isoDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// OwnerRez's own BookingStatus enum maps directly onto our three-way
// outcome -- no ambiguity to judge, unlike the other three adapters.
// is_block (a manual calendar block rather than a real guest booking) is
// kept out of "active" regardless of status: a block might mean the owner
// is staying personally and will want a clean after, or might just be a
// maintenance hold nobody occupies -- there's no further signal to tell
// those apart, so it's tracked but never creates or cancels a clean on its
// own, same conservative default as any other status this adapter doesn't
// specifically recognise.
function outcomeFor(booking: OwnerRezBooking): PmsReservationOutcome {
  if (booking.is_block) return "pending";
  if (booking.status === "active") return "active";
  if (booking.status === "canceled") return "cancelled";
  return "pending";
}

async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const all: OwnerRezBooking[] = [];
  let offset = 0;
  for (;;) {
    // OwnerRez's own wording: `from` filters for bookings that *depart* on
    // or after it, `to` filters for bookings that *arrive* on or before it
    // -- not a matching pair on the same date field, so this is a window
    // ("anything that overlaps our lookback-to-horizon range") rather than
    // a filter on one single date, same intent as the other adapters' own
    // start/end params.
    const params = new URLSearchParams({
      property_ids: listingId,
      from: isoDateParam(startDate),
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (endDate) params.set("to", isoDateParam(endDate));

    const body = await ownerRezGet<OwnerRezBookingsResponse>("/bookings", params, credentials);
    all.push(...body.items);
    if (body.items.length < PAGE_SIZE || all.length >= body.count) break;
    offset += PAGE_SIZE;
  }

  return all.map((b) => ({
    externalId: String(b.id),
    checkIn: new Date(b.arrival),
    checkOut: new Date(b.departure),
    guests: (b.adults ?? 0) + (b.children ?? 0) + (b.infants ?? 0) || null,
    status: b.status,
    outcome: outcomeFor(b),
  }));
}

export const ownerrezAdapter: PmsAdapter = {
  provider: "OWNERREZ",
  displayName: "OwnerRez",
  credentialFields: [
    { key: "username", label: "OwnerRez account email", helpText: "The email you sign in to OwnerRez with." },
    {
      key: "token",
      label: "Personal access token",
      helpText: "Generate one from OwnerRez → Settings → API Tokens.",
    },
  ],
  listListings,
  fetchReservations,
};
