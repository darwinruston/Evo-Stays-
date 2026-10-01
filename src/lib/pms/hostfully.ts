import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Hostfully's published Property Management Platform API v3.3
// reference (dev.hostfully.com) with no live account to test against --
// see the comments below for the specific judgment calls made along the
// way. Follows the never-throws, record-your-own-error contract
// src/lib/pms/sync.ts expects of every adapter, same as
// src/lib/pms/hostify.ts.
//
// Base URL assumed to be the production host mirroring the documented
// sandbox one (sandbox-api.hostfully.com -> api.hostfully.com) -- the only
// host the published docs actually show examples against is sandbox, so
// this is the one genuinely unconfirmed structural guess in this adapter,
// worth double-checking first if a real Hostfully connection fails outright
// rather than just rejecting credentials.
const BASE_URL = "https://api.hostfully.com/api/v3.3";
const PAGE_LIMIT = 100;

function credsOf(credentials: PmsCredentials): { apiKey: string; agencyUid: string } {
  const apiKey = credentials.apiKey;
  const agencyUid = credentials.agencyUid;
  if (!apiKey || !agencyUid) throw new Error("No Hostfully API key / agency ID configured on this client.");
  return { apiKey, agencyUid };
}

// Hostfully's documented response envelope for list endpoints isn't shown
// with a full example in the published reference (only request shapes
// are) -- this is the conventional {data, nextCursor} shape its _cursor/
// _limit query parameters imply. Defaulted to empty rather than throwing
// if a real response doesn't match, so an unexpected envelope shape shows
// up as "no listings found" rather than a crash.
type HostfullyPage<T> = { data?: T[]; nextCursor?: string | null };

async function hostfullyGet<T>(path: string, params: URLSearchParams, apiKey: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { "X-HOSTFULLY-APIKEY": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Hostfully request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

type HostfullyAddress = {
  street1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type HostfullyProperty = {
  uid: string;
  name: string | null;
  address: HostfullyAddress | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: string | null; // string-typed on Hostfully's own schema, can carry a half-bath like "1.5"
};

// Hostfully's propertyType enum has real string matches for most of our
// own five-value enum, confirmed against its documented 70+ value list --
// unlike Hostaway/Guesty's opaque type ids.
const PROPERTY_TYPE_MAP: Record<string, PmsListing["propertyType"]> = {
  HOUSE: "HOUSE",
  COTTAGE: "COTTAGE",
  STUDIO: "STUDIO",
  APARTMENT: "APARTMENT",
};

function mapPropertyType(raw: string | null): PmsListing["propertyType"] {
  return (raw && PROPERTY_TYPE_MAP[raw]) || "OTHER";
}

function buildAddress(property: HostfullyProperty): string {
  const a = property.address;
  if (!a) return property.name ?? "";
  const parts = [a.street1, a.city, a.zipCode].filter((p): p is string => !!p && p.trim() !== "");
  return parts.length > 0 ? parts.join(", ") : property.name ?? "";
}

function parseBathrooms(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const { apiKey, agencyUid } = credsOf(credentials);
  const all: HostfullyProperty[] = [];
  let cursor: string | null | undefined;
  for (;;) {
    const params = new URLSearchParams({ agencyUid, _limit: String(PAGE_LIMIT) });
    if (cursor) params.set("_cursor", cursor);
    const body = await hostfullyGet<HostfullyPage<HostfullyProperty>>("/properties", params, apiKey);
    const page = body.data ?? [];
    all.push(...page);
    if (!body.nextCursor || page.length < PAGE_LIMIT) break;
    cursor = body.nextCursor;
  }

  return all.map((property) => ({
    externalId: property.uid,
    name: property.name,
    address: buildAddress(property),
    latitude: property.address?.latitude ?? null,
    longitude: property.address?.longitude ?? null,
    propertyType: mapPropertyType(property.propertyType),
    bedrooms: property.bedrooms,
    bathrooms: parseBathrooms(property.bathrooms),
    maxOccupancy: null, // not present on the property resource; max_guests lives per rate/rule, not the property itself
  }));
}

type HostfullyLead = {
  uid: string;
  checkInLocalDate: string | null;
  checkOutLocalDate: string | null;
  checkInLocalDateTime: string | null;
  checkOutLocalDateTime: string | null;
  status: string;
  guestInformation: { numberOfGuests: number | null } | null;
};

// Hostfully's own documented status workflow: leads only block the
// calendar (i.e. a stay is genuinely going to occupy the property) in
// statuses BOOKED, BLOCKED, PENDING, and ON_HOLD. BLOCKED is kept out of
// "active" regardless -- it's a manual calendar block (the BLOCK lead
// type), same conservative default as every other adapter's own block/
// hold handling, since there's no further signal to tell an owner's
// personal stay from a maintenance hold nobody occupies. CANCELLED,
// DECLINED and CLOSED are treated as cancelled (the lead will not result
// in a stay, including cancelling a clean an earlier active state may have
// already created); everything else (NEW, PENDING_APPROVED, IGNORED,
// DUPLICATE, SAMPLE -- none calendar-blocking, so none confirmed enough to
// act on) falls through to "pending", same never-creates-or-cancels-on-
// its-own fallback src/lib/pms/hostify.ts uses for any status it doesn't
// specifically recognise.
const ACTIVE_STATUSES = new Set(["BOOKED", "PENDING", "ON_HOLD"]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "DECLINED", "CLOSED"]);

function outcomeFor(status: string): PmsReservationOutcome {
  if (ACTIVE_STATUSES.has(status)) return "active";
  if (CANCELLED_STATUSES.has(status)) return "cancelled";
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
  const { apiKey } = credsOf(credentials);
  const all: HostfullyLead[] = [];
  let cursor: string | null | undefined;
  for (;;) {
    const params = new URLSearchParams({
      propertyUid: listingId,
      checkOutFrom: isoDateParam(startDate),
      _limit: String(PAGE_LIMIT),
    });
    if (endDate) params.set("checkOutTo", isoDateParam(endDate));
    if (cursor) params.set("_cursor", cursor);

    const body = await hostfullyGet<HostfullyPage<HostfullyLead>>("/leads", params, apiKey);
    const page = body.data ?? [];
    all.push(...page);
    if (!body.nextCursor || page.length < PAGE_LIMIT) break;
    cursor = body.nextCursor;
  }

  return all.map((lead) => ({
    externalId: lead.uid,
    checkIn: new Date(lead.checkInLocalDateTime ?? lead.checkInLocalDate ?? ""),
    checkOut: new Date(lead.checkOutLocalDateTime ?? lead.checkOutLocalDate ?? ""),
    guests: lead.guestInformation?.numberOfGuests ?? null,
    status: lead.status,
    outcome: outcomeFor(lead.status),
  }));
}

export const hostfullyAdapter: PmsAdapter = {
  provider: "HOSTFULLY",
  displayName: "Hostfully",
  credentialFields: [
    { key: "apiKey", label: "API key", helpText: "From Hostfully → Agency Settings → API." },
    { key: "agencyUid", label: "Agency ID", helpText: "Also found on the Agency Settings page." },
  ],
  listListings,
  fetchReservations,
};
