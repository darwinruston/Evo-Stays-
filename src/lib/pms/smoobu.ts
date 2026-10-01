import { createHash, createHmac, randomUUID } from "crypto";
import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter, PmsCredentials, PmsListing, PmsReservation, PmsReservationOutcome } from "@/lib/pms/types";

// Built to Smoobu's published API reference (docs.smoobu.com) with no live
// account to test against -- see the comments below for the specific
// judgment calls made along the way. Follows the never-throws,
// record-your-own-error contract src/lib/pms/sync.ts expects of every
// adapter, same as src/lib/pms/hostify.ts.
//
// Deliberately uses HMAC authentication, not Smoobu's simpler legacy
// Api-Key header -- the legacy method is documented as sunsetting October
// 31, 2026, close enough to today that building on it now would mean
// shipping something already near end-of-life. HMAC signs every request
// with a canonical string (method, path, sorted+RFC3986-encoded query
// string, timestamp, nonce, body hash, API key) over HMAC-SHA256, base64
// encoded -- see smoobuSign below for the exact recipe, transcribed
// directly from Smoobu's documented signed-request examples since a
// mistake here fails every single request with a 401, not just one
// feature.

const BASE_URL = "https://login.smoobu.com";

function rfc3986Encode(value: string): string {
  // encodeURIComponent leaves !'()* unescaped (they're unreserved in the
  // older spec it follows); RFC3986 treats them as reserved, and Smoobu's
  // canonical-string spec is explicit about RFC3986 -- so those five get an
  // extra pass.
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQueryString(params: URLSearchParams): string {
  const entries = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`).join("&");
}

async function smoobuGet<T>(path: string, params: URLSearchParams, credentials: PmsCredentials): Promise<T> {
  const apiKey = credentials.apiKey;
  const apiSecret = credentials.apiSecret;
  if (!apiKey || !apiSecret) throw new Error("No Smoobu API key / secret configured on this client.");

  // ISO 8601 UTC with no fractional seconds, matching Smoobu's documented
  // example exactly (toISOString() includes milliseconds by default).
  const timestamp = `${new Date().toISOString().split(".")[0]}Z`;
  const nonce = randomUUID();
  const bodyHash = createHash("sha256").update("").digest("hex"); // GET requests always have an empty body
  const queryString = canonicalQueryString(params);
  const canonical = `GET\n${path}\n${queryString}\n${timestamp}\n${nonce}\n${bodyHash}\n${apiKey}`;
  const signature = createHmac("sha256", apiSecret).update(canonical).digest("base64");

  const qs = params.toString();
  const res = await fetch(`${BASE_URL}${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      "X-API-Key": apiKey,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new PmsAuthError(`rejected, ${res.status}`);
    throw new Error(`Smoobu request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

type SmoobuApartmentSummary = { id: number; name: string };
type SmoobuApartmentsResponse = { apartments: SmoobuApartmentSummary[] };

type SmoobuApartmentDetail = {
  location: {
    street: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
  };
  rooms: { maxOccupancy: number | null; bedrooms: number | null; bathrooms: number | null };
};

function buildAddress(name: string, location: SmoobuApartmentDetail["location"]): string {
  const parts = [location.street, location.city, location.zip].filter(
    (p): p is string => !!p && p.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : name;
}

// GET /api/apartments only returns id+name -- full details (address, room
// counts) need a second call per apartment via GET /api/apartments/{id}.
// Fetched concurrently: Smoobu's documented rate limit (700 requests/min)
// comfortably covers a typical portfolio's worth of detail calls in one
// batch.
async function listListings(credentials: PmsCredentials): Promise<PmsListing[]> {
  const { apartments } = await smoobuGet<SmoobuApartmentsResponse>(
    "/api/apartments",
    new URLSearchParams(),
    credentials,
  );

  const details = await Promise.all(
    apartments.map((a) =>
      smoobuGet<SmoobuApartmentDetail>(`/api/apartments/${a.id}`, new URLSearchParams(), credentials),
    ),
  );

  return apartments.map((apartment, i) => {
    const detail = details[i];
    const lat = detail.location.latitude ? Number.parseFloat(detail.location.latitude) : null;
    const lng = detail.location.longitude ? Number.parseFloat(detail.location.longitude) : null;
    return {
      externalId: String(apartment.id),
      name: apartment.name,
      address: buildAddress(apartment.name, detail.location),
      latitude: lat !== null && Number.isFinite(lat) ? lat : null,
      longitude: lng !== null && Number.isFinite(lng) ? lng : null,
      // Smoobu's apartment "type" field (e.g. "Holiday rental") is a
      // free-text label, not a documented enum matching our own values --
      // mapped to OTHER rather than guessing.
      propertyType: "OTHER",
      bedrooms: detail.rooms.bedrooms,
      bathrooms: detail.rooms.bathrooms,
      maxOccupancy: detail.rooms.maxOccupancy,
    };
  });
}

type SmoobuBooking = {
  id: number;
  type: "reservation" | "modification of booking" | "cancellation";
  arrival: string;
  departure: string;
  adults: number | null;
  children: number | null;
  "is-blocked-booking": boolean;
};

type SmoobuBookingsResponse = { page_count: number; bookings: SmoobuBooking[] };

// Smoobu's "type" field doubles as the outcome signal -- there's no
// separate status field. A manual calendar block (is-blocked-booking) is
// kept out of "active" regardless of type, same conservative default as
// every other adapter's own block/hold handling: there's no further signal
// to tell an owner's personal stay from a maintenance hold nobody
// occupies.
function outcomeFor(booking: SmoobuBooking): PmsReservationOutcome {
  if (booking["is-blocked-booking"]) return "pending";
  if (booking.type === "cancellation") return "cancelled";
  return "active";
}

async function fetchReservations(
  credentials: PmsCredentials,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<PmsReservation[]> {
  const all: SmoobuBooking[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      apartmentId: listingId,
      departureFrom: startDate.toISOString().slice(0, 10),
      // showCancellation is required to see cancellations at all -- Smoobu
      // excludes them from the default result set, which would otherwise
      // mean a real cancellation is silently never reflected here.
      showCancellation: "true",
      page: String(page),
      pageSize: "100",
    });
    if (endDate) params.set("departureTo", endDate.toISOString().slice(0, 10));

    const body = await smoobuGet<SmoobuBookingsResponse>("/api/reservations", params, credentials);
    all.push(...body.bookings);
    if (page >= body.page_count) break;
    page++;
  }

  return all.map((b) => ({
    externalId: String(b.id),
    checkIn: new Date(b.arrival),
    checkOut: new Date(b.departure),
    guests: (b.adults ?? 0) + (b.children ?? 0) || null,
    status: b.type,
    outcome: outcomeFor(b),
  }));
}

export const smoobuAdapter: PmsAdapter = {
  provider: "SMOOBU",
  displayName: "Smoobu",
  credentialFields: [
    { key: "apiKey", label: "API key", helpText: "From Smoobu → Settings → Advanced → API Keys." },
    { key: "apiSecret", label: "API secret", helpText: "Shown once when the key is created -- generate a new key if it's been lost." },
  ],
  listListings,
  fetchReservations,
};
