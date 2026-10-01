import { PmsAuthError } from "@/lib/pms/errors";
import { requestClientCredentialsToken } from "@/lib/pms/oauth";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Guesty's published Open API reference
// (open-api-docs.guesty.com) with no live account to test against -- see
// the credentialFields helpText and the comments below for the specific
// judgment calls made along the way. This is Guesty's self-serve Open API
// (an account holder creates their own OAuth app in their own dashboard),
// not the separate Marketplace/Channel Partner program. Follows the
// never-throws, record-your-own-error contract src/lib/pms/sync.ts expects
// of every adapter, same as src/lib/pms/hostify.ts.

const BASE_URL = "https://open-api.guesty.com/v1";
const TOKEN_URL = "https://open-api.guesty.com/oauth2/token";
const PAGE_SIZE = 100;

type CachedToken = { token: string; expiresAt: number };
// Keyed by the credential pair itself, not the client id in our own
// database -- correct even if the same Guesty account ends up connected to
// more than one Client record. In-process only (cleared on restart), which
// is fine: a fresh token costs one request, same as a cold start today.
const tokenCache = new Map<string, CachedToken>();

// Guesty documents up to 5 access tokens per API key per 24h, each valid
// 24h -- a real, hard quota, not just a courtesy limit like Hostaway's.
// Minting a fresh token on every sync call (this app's scheduler can run
// several times a day, across however many properties one client has)
// would exhaust that quota almost immediately and start failing every
// Guesty sync for the rest of the day. Cached here so every property under
// the same client reuses one token until it's genuinely close to expiry.
async function getToken(credentials: PmsCredentials): Promise<string> {
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  if (!clientId || !clientSecret) throw new Error("No Guesty client ID / secret configured on this client.");

  const cacheKey = `${clientId}:${clientSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { token, expiresInSeconds } = await requestClientCredentialsToken({
    url: TOKEN_URL,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    providerName: "Guesty",
  });

  // A 5-minute safety margin below the real expiry, falling back to a
  // conservative 1 hour if Guesty ever omits expires_in -- better to
  // re-authenticate an extra time than to cache a token past its real
  // expiry and have every call fail until the cache is cleared.
  const ttlMs = (expiresInSeconds ?? 3600) * 1000;
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + Math.max(ttlMs - 5 * 60 * 1000, 0) });
  return token;
}

type GuestyEnvelope<T> = { results: T[] } | { message?: string; statusCode?: number };

async function guestyGet<T>(path: string, params: URLSearchParams, token: string): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  for (;;) {
    params.set("limit", String(PAGE_SIZE));
    params.set("skip", String(skip));
    const res = await fetch(`${BASE_URL}${path}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = (await res.json()) as GuestyEnvelope<T>;
    if (!res.ok || !("results" in body)) {
      const reason = "message" in body ? body.message : undefined;
      if (res.status === 401 || res.status === 403) throw new PmsAuthError(reason || `rejected, ${res.status}`);
      throw new Error(reason || `Guesty request failed (${res.status})`);
    }
    all.push(...body.results);
    if (body.results.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

type GuestyListing = {
  _id: string;
  title: string | null;
  address: {
    full?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  bedrooms: number | null;
  bathrooms: number | null;
  accommodates: number | null;
};

function buildAddress(listing: GuestyListing): string {
  const a = listing.address;
  if (!a) return listing.title ?? "";
  const parts = [a.street, a.city, a.zipcode].filter((p): p is string => !!p && p.trim() !== "");
  if (parts.length > 0) return parts.join(", ");
  return a.full || listing.title || "";
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const token = await getToken(credentials);
  const params = new URLSearchParams({
    fields: "title address bedrooms bathrooms accommodates",
  });
  const listings = await guestyGet<GuestyListing>("/listings", params, token);

  return listings.map((listing) => ({
    externalId: listing._id,
    name: listing.title,
    address: buildAddress(listing),
    latitude: listing.address?.lat ?? null,
    longitude: listing.address?.lng ?? null,
    // Guesty's propertyType vocabulary isn't pinned down in the published
    // docs available while building this -- mapped to OTHER rather than
    // guessing at values that might not match real accounts.
    propertyType: "OTHER",
    bedrooms: listing.bedrooms === null ? null : Math.round(listing.bedrooms),
    bathrooms: listing.bathrooms === null ? null : Math.round(listing.bathrooms),
    maxOccupancy: listing.accommodates === null ? null : Math.round(listing.accommodates),
  }));
}

type GuestyReservation = {
  _id: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number | null;
  status: string;
};

// Guesty's documented status values: "reserved", "confirmed", "canceled",
// "closed", "expired". "reserved" and "confirmed" are both treated as
// active -- a hold or a confirmed booking either way blocks the property
// and needs a clean; "closed" (a completed stay) is active too, since it
// represents a real visit that happened. "canceled" is the one clearly
// dead state. "expired" (never became a real booking) falls through to
// "pending", same never-creates-or-cancels-on-its-own fallback
// src/lib/pms/hostify.ts uses for any status it doesn't specifically
// recognise.
const ACTIVE_STATUSES = new Set(["reserved", "confirmed", "closed"]);
const CANCELLED_STATUSES = new Set(["canceled", "cancelled"]);

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
  const filters: Record<string, unknown>[] = [{ field: "listingId", operator: "$eq", value: listingId }];
  if (endDate) {
    filters.push({
      field: "checkOut",
      operator: "$between",
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    });
  } else {
    filters.push({ field: "checkOut", operator: "$gte", value: startDate.toISOString() });
  }

  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: "checkIn checkOut guestsCount status",
  });
  const reservations = await guestyGet<GuestyReservation>("/reservations", params, token);

  return reservations.map((r) => ({
    externalId: r._id,
    checkIn: new Date(r.checkIn),
    checkOut: new Date(r.checkOut),
    guests: r.guestsCount,
    status: r.status,
    outcome: outcomeFor(r.status),
  }));
}

export const guestyAdapter: PmsAdapter = {
  provider: "GUESTY",
  displayName: "Guesty",
  credentialFields: [
    { key: "clientId", label: "Client ID", helpText: "From your Guesty account → Open API apps." },
    { key: "clientSecret", label: "Client secret", helpText: "Shown once when the app is created -- generate a new app if it's been lost." },
  ],
  listListings,
  fetchReservations,
};
