import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Hospitable's published Public API v2 reference
// (developer.hospitable.com) with no live account to test against -- see
// the comments below for the specific judgment calls made along the way.
// Auth is a Personal Access Token over Bearer, generated directly in the
// user's own account settings -- API keys were retired by Hospitable in
// favour of this in February 2025. Follows the never-throws,
// record-your-own-error contract src/lib/pms/sync.ts expects of every
// adapter, same as src/lib/pms/hostify.ts.

const BASE_URL = "https://public.api.hospitable.com/v2";
const PAGE_SIZE = 100;

function tokenOf(credentials: PmsCredentials): string {
  const token = credentials.pat;
  if (!token) throw new Error("No Hospitable personal access token configured on this client.");
  return token;
}

async function hospitableGet<T>(path: string, params: URLSearchParams, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Hospitable request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

type HospitableAddress = {
  number: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  coordinates: { latitude: number | null; longitude: number | null } | null;
  display: string | null;
};

type HospitableProperty = {
  id: string;
  name: string | null;
  public_name: string | null;
  address: HospitableAddress | null;
  capacity: { max: number | null; bedrooms: number | null; beds: number | null; bathrooms: number | null } | null;
  property_type: string | null;
};

type HospitablePage<T> = { data: T[]; meta: { current_page: number; last_page: number } };

function buildAddress(property: HospitableProperty): string {
  const a = property.address;
  if (a?.display) return a.display;
  if (!a) return property.name ?? property.public_name ?? "";
  const parts = [a.number && a.street ? `${a.number} ${a.street}` : a.street, a.city, a.postcode].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : property.name ?? property.public_name ?? "";
}

// Hospitable's property_type is free text, not a documented enum (the
// published schema just shows "string" with no allowed-values list) --
// mapped only for the exact capitalised words Airbnb/Hospitable commonly
// use, default OTHER rather than guessing further.
const PROPERTY_TYPE_MAP: Record<string, PmsListing["propertyType"]> = {
  Apartment: "APARTMENT",
  House: "HOUSE",
  Studio: "STUDIO",
  Cottage: "COTTAGE",
};

function mapPropertyType(raw: string | null): PmsListing["propertyType"] {
  return (raw && PROPERTY_TYPE_MAP[raw]) || "OTHER";
}

async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const token = tokenOf(credentials);
  const all: HospitableProperty[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
    const body = await hospitableGet<HospitablePage<HospitableProperty>>("/properties", params, token);
    all.push(...body.data);
    if (page >= body.meta.last_page) break;
    page++;
  }

  return all.map((property) => ({
    externalId: property.id,
    name: property.name ?? property.public_name,
    address: buildAddress(property),
    latitude: property.address?.coordinates?.latitude ?? null,
    longitude: property.address?.coordinates?.longitude ?? null,
    propertyType: mapPropertyType(property.property_type),
    bedrooms: property.capacity?.bedrooms ?? null,
    bathrooms: property.capacity?.bathrooms ?? null,
    maxOccupancy: property.capacity?.max ?? null,
  }));
}

type HospitableReservation = {
  id: string;
  check_in: string;
  check_out: string;
  reservation_status: { current: { category: string; sub_category: string | null } };
  guests: { total: number | null } | null;
  stay_type: "guest_stay" | "owner_stay" | null;
  owner_stay: { schedule_cleaning: boolean } | null;
};

// Hospitable's own documented status categories (both the status[] filter's
// allowed values and reservation_status.current.category's real values):
// request, accepted, cancelled, not_accepted, checkpoint. "accepted" is the
// one clearly-confirmed state; "cancelled" clearly dead; everything else
// (request, not_accepted, checkpoint) falls through to "pending", same
// never-creates-or-cancels-on-its-own fallback src/lib/pms/hostify.ts uses
// for any status it doesn't specifically recognise.
function outcomeFor(reservation: HospitableReservation): PmsReservationOutcome {
  // Hospitable uniquely tells us directly whether an owner stay actually
  // needs a clean afterwards (owner_stay.schedule_cleaning) -- richer
  // signal than any other adapter's guess at manual-block semantics, so
  // it's used instead of the status category when present.
  if (reservation.stay_type === "owner_stay" && reservation.owner_stay?.schedule_cleaning === false) {
    return "pending";
  }
  const category = reservation.reservation_status.current.category;
  if (category === "accepted") return "active";
  if (category === "cancelled") return "cancelled";
  return "pending";
}

async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const token = tokenOf(credentials);
  const all: HospitableReservation[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      "properties[]": listingId,
      date_query: "checkout",
      start_date: startDate.toISOString().slice(0, 10),
      page: String(page),
      per_page: String(PAGE_SIZE),
    });
    if (endDate) params.set("end_date", endDate.toISOString().slice(0, 10));
    // status[] needs repeating per value, not comma-joined -- appended
    // directly since URLSearchParams' constructor can't express repeated
    // keys from a plain object.
    for (const status of ["request", "accepted", "cancelled", "not_accepted", "checkpoint"]) {
      params.append("status[]", status);
    }

    const body = await hospitableGet<HospitablePage<HospitableReservation>>("/reservations", params, token);
    all.push(...body.data);
    if (page >= body.meta.last_page) break;
    page++;
  }

  return all.map((r) => ({
    externalId: r.id,
    checkIn: new Date(r.check_in),
    checkOut: new Date(r.check_out),
    guests: r.guests?.total ?? null,
    status: r.reservation_status.current.category,
    outcome: outcomeFor(r),
  }));
}

export const hospitableAdapter: PmsAdapter = {
  provider: "HOSPITABLE",
  displayName: "Hospitable",
  credentialFields: [
    {
      key: "pat",
      label: "Personal access token",
      helpText: "From Hospitable → Apps (or Settings → Integrations) → API access.",
    },
  ],
  listListings,
  fetchReservations,
};
