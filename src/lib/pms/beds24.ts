import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Beds24's published OpenAPI v2 spec
// (beds24.com/api/v2/apiV2.yaml, read directly rather than trusting a
// third-party summary) with no live account to test against -- see the
// comments below for the specific judgment calls made along the way.
// Follows the never-throws, record-your-own-error contract
// src/lib/pms/sync.ts expects of every adapter, same as
// src/lib/pms/hostify.ts.
//
// Auth is the one genuine wrinkle in this wave: Beds24's dashboard issues a
// single-use invite code, not a reusable credential -- it has to be
// exchanged once for a refresh token (GET /authentication/setup), and the
// refresh token (which the docs confirm doesn't expire as long as it's
// used at least once every 30 days -- which this app's regular background
// sync easily satisfies) is what actually needs storing, not the invite
// code itself. There's no mechanism for an adapter to write a new
// credential back into Client.pmsCredentials after exchanging one, so the
// credential field asks for the refresh token directly: the user runs the
// one-time exchange themselves (a single documented curl call) and pastes
// the result here, rather than Evo Stays holding a short-lived invite code
// it could only use once. Every actual API call then exchanges that
// refresh token for a fresh short-lived access token via
// GET /authentication/token -- cheap, and not meaningfully rate-limited
// per Beds24's docs (unlike Guesty's hard 5-tokens-per-24h cap), so no
// caching here.

const BASE_URL = "https://beds24.com/api/v2";

async function getAccessToken(credentials: PmsCredentials): Promise<string> {
  const refreshToken = credentials.refreshToken;
  if (!refreshToken) throw new Error("No Beds24 refresh token configured on this client.");

  const res = await fetch(`${BASE_URL}/authentication/token`, {
    headers: { refreshToken },
  });
  const body = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!res.ok || !body?.token) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Beds24 token request failed (${res.status})`);
  }
  return body.token;
}

async function beds24Get<T>(path: string, params: URLSearchParams, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { token, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Beds24 request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

type Beds24Property = {
  id: number;
  name: string | null;
  propertyType: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Beds24Page<T> = { data: T[]; pages: { nextPageExists: boolean } };

// Beds24's propertyType enum has real string matches for most of our own
// five-value enum (confirmed against its documented list, which also
// includes an inconsistent capitalised duplicate "House" alongside the
// lowercase "house" -- normalised below rather than trusting one casing).
const PROPERTY_TYPE_MAP: Record<string, PmsListing["propertyType"]> = {
  house: "HOUSE",
  apartment: "APARTMENT",
  studio: "STUDIO",
  cottage: "COTTAGE",
};

function mapPropertyType(raw: string | null): PmsListing["propertyType"] {
  return (raw && PROPERTY_TYPE_MAP[raw.toLowerCase()]) || "OTHER";
}

function buildAddress(property: Beds24Property): string {
  const parts = [property.address, property.city, property.postcode].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : property.name ?? "";
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const token = await getAccessToken(credentials);
  const all: Beds24Property[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ page: String(page) });
    const body = await beds24Get<Beds24Page<Beds24Property>>("/properties", params, token);
    all.push(...body.data);
    if (!body.pages.nextPageExists) break;
    page++;
  }

  return all.map((property) => ({
    externalId: String(property.id),
    name: property.name,
    address: buildAddress(property),
    latitude: property.latitude,
    longitude: property.longitude,
    propertyType: mapPropertyType(property.propertyType),
    // Not present on the property resource itself -- Beds24 models room
    // counts per room-type under a property, not as flat property-level
    // fields, so these are left null for staff to fill in by hand after
    // import, same as any manually-added property.
    bedrooms: null,
    bathrooms: null,
    maxOccupancy: null,
  }));
}

type Beds24Booking = {
  id: number;
  propertyId: number;
  arrival: string;
  departure: string;
  numAdult: number | null;
  numChild: number | null;
  status: "confirmed" | "request" | "new" | "cancelled" | "black" | "inquiry";
};

// Beds24's own documented status enum maps cleanly: "confirmed" is the one
// clearly-active state; "cancelled" clearly dead; "black" (a manual
// calendar block) is kept out of "active" regardless, same conservative
// default as every other adapter's own block handling; "request"/"new"/
// "inquiry" (none guaranteed to ever become a real stay) fall through to
// "pending", same never-creates-or-cancels-on-its-own fallback
// src/lib/pms/hostify.ts uses for any status it doesn't specifically
// recognise.
function outcomeFor(status: Beds24Booking["status"]): PmsReservationOutcome {
  if (status === "confirmed") return "active";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function isoDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const token = await getAccessToken(credentials);
  const all: Beds24Booking[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      propertyId: listingId,
      departureFrom: isoDateParam(startDate),
      page: String(page),
    });
    if (endDate) params.set("departureTo", isoDateParam(endDate));
    // Every status, not just the API's own default (confirmed/request/new/
    // black/inquiry) -- without this, a real cancellation would never be
    // returned at all, and this sync would never learn a previously-active
    // booking got cancelled.
    for (const status of ["confirmed", "request", "new", "cancelled", "black", "inquiry"]) {
      params.append("status", status);
    }

    const body = await beds24Get<Beds24Page<Beds24Booking>>("/bookings", params, token);
    all.push(...body.data);
    if (!body.pages.nextPageExists) break;
    page++;
  }

  return all.map((b) => ({
    externalId: String(b.id),
    checkIn: new Date(b.arrival),
    checkOut: new Date(b.departure),
    guests: (b.numAdult ?? 0) + (b.numChild ?? 0) || null,
    status: b.status,
    outcome: outcomeFor(b.status),
  }));
}

export const beds24Adapter: PmsAdapter = {
  provider: "BEDS24",
  displayName: "Beds24",
  credentialFields: [
    {
      key: "refreshToken",
      label: "Refresh token",
      helpText:
        "Generate an invite code at Beds24 → Settings → Apps/API, then exchange it once for a refresh token (GET /authentication/setup with the code in an \"code\" header) and paste that token here -- not the invite code itself, which only works once.",
    },
  ],
  listListings,
  fetchReservations,
};
