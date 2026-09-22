import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { createCleanRecord } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { logAudit } from "@/lib/audit";

const HOSTIFY_BASE_URL = "https://api-rms.hostify.com";
const PAGE_SIZE = 100;
// A reservation that checked out this recently is still worth reconciling
// (a late cancellation, say) -- older than that is outside anything a
// realistic syncHorizonDays would care about, so there's no point paying for
// an ever-growing full-history fetch the way an iCal feed never requires.
const LOOKBACK_DAYS = 7;

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

// Distinguished from a plain Error so the catch block in syncHostifyListing
// can point staff at the API key specifically, rather than a generic
// message that could mean anything from a typo'd listing id to an outage.
class HostifyAuthError extends Error {}

// Node's fetch throws a bare `TypeError: fetch failed` for anything at the
// network layer (DNS, connection refused, TLS) -- accurate, but meaningless
// to whoever's staring at it on the property page. Translated here into
// something that tells staff what to actually do about it.
function describeSyncError(err: unknown): string {
  if (err instanceof HostifyAuthError) {
    return `Hostify rejected the API key (${err.message}) -- check it on the client.`;
  }
  if (err instanceof TypeError && err.message === "fetch failed") {
    return "Couldn't reach Hostify -- check your connection and try again shortly.";
  }
  return err instanceof Error ? err.message : "Couldn't reach Hostify";
}

// Hostify's own docs don't pin down whether start_date/end_date filter by
// check-in, check-out, or booking-creation date -- so this passes them as a
// best-effort narrowing, but syncHostifyListing still re-checks the horizon
// cutoff itself on every reservation, same defensive belt-and-braces
// icalSync.ts already relies on.
async function fetchReservations(
  apiKey: string,
  listingId: string,
  startDate: Date,
  endDate: Date | null,
): Promise<HostifyReservation[]> {
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
        throw new HostifyAuthError(reason || `rejected, ${res.status}`);
      }
      throw new Error(reason || `Hostify request failed (${res.status})`);
    }

    all.push(...body.reservations);
    if (all.length >= body.total || body.reservations.length === 0) break;
    page++;
  }
  return all;
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

type ReservationOutcome = "active" | "cancelled" | "pending";

// "pending" is also the fallback for any status Hostify might add later --
// tracked, but never creates or cancels a Clean on its own, so an
// unrecognized value can't silently do either.
function outcomeFor(status: string): ReservationOutcome {
  if (status === "accepted") return "active";
  if (CANCELLED_STATUSES.has(status)) return "cancelled";
  return "pending";
}

// One pass over a single Property's linked Hostify listing: fetch its
// reservations, upsert a SyncedHostifyReservation per reservation id (keyed
// on [propertyId, hostifyReservationId], so re-running this is idempotent),
// and create/update/cancel the Clean each one drives. Mirrors
// syncCalendarFeed in src/lib/icalSync.ts as closely as the data differs --
// never throws, a fetch/decrypt/API failure is recorded as
// Property.hostifyLastSyncError instead.
export async function syncHostifyListing(propertyId: string, triggeredById: string): Promise<void> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: {
      hostifyListingId: true,
      syncHorizonDays: true,
      client: { select: { hostifyApiKey: true } },
    },
  });

  // Defence in depth -- the action calling this already checks both, but a
  // property can be reached here from the unattended scheduler too, which
  // has no form to validate ahead of time.
  if (property.hostifyListingId === null) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { hostifyLastSyncError: "No Hostify listing configured on this property" },
    });
    return;
  }
  if (!property.client.hostifyApiKey) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { hostifyLastSyncError: "No Hostify API key configured on this client" },
    });
    return;
  }

  const horizon = property.syncHorizonDays;
  const cutoff = horizon !== null ? new Date(Date.now() + horizon * 24 * 60 * 60 * 1000) : null;
  const lookback = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    let apiKey: string;
    try {
      apiKey = decrypt(property.client.hostifyApiKey);
    } catch {
      // ENCRYPTION_KEY rotated, or the stored ciphertext is corrupt --
      // either way the key on file can no longer be used, and re-entering
      // it is the only fix.
      throw new Error("Couldn't decrypt the stored API key -- re-enter it on the client.");
    }
    const reservations = await fetchReservations(apiKey, property.hostifyListingId, lookback, cutoff);

    for (const reservation of reservations) {
      const checkIn = new Date(reservation.checkIn);
      const checkOut = new Date(reservation.checkOut);
      const outcome = outcomeFor(reservation.status);

      const existing = await prisma.syncedHostifyReservation.findUnique({
        where: {
          propertyId_hostifyReservationId: { propertyId, hostifyReservationId: String(reservation.id) },
        },
        include: { clean: true },
      });

      // First sighting of this reservation. A pending/cancelled one is only
      // tracked -- see outcomeFor -- so a later flip to accepted is seen as
      // a change below, not mistaken for brand new.
      if (!existing) {
        if (outcome === "active" && (cutoff === null || checkOut <= cutoff)) {
          const clean = await createCleanRecord({
            propertyId,
            createdById: triggeredById,
            scheduledFor: checkOut,
            guestCount: reservation.guests,
          });
          await prisma.syncedHostifyReservation.create({
            data: {
              propertyId,
              hostifyReservationId: String(reservation.id),
              status: reservation.status,
              checkIn,
              checkOut,
              guests: reservation.guests,
              cleanId: clean.id,
            },
          });
        } else {
          await prisma.syncedHostifyReservation.create({
            data: {
              propertyId,
              hostifyReservationId: String(reservation.id),
              status: reservation.status,
              checkIn,
              checkOut,
              guests: reservation.guests,
              cancelled: outcome === "cancelled",
            },
          });
        }
        continue;
      }

      const changed =
        existing.status !== reservation.status ||
        existing.checkIn.getTime() !== checkIn.getTime() ||
        existing.checkOut.getTime() !== checkOut.getTime();
      if (!changed) continue;

      // First confirmation (pending -> accepted) with no Clean yet behaves
      // like a brand-new booking.
      if (outcome === "active" && !existing.clean && (cutoff === null || checkOut <= cutoff)) {
        const clean = await createCleanRecord({
          propertyId,
          createdById: triggeredById,
          scheduledFor: checkOut,
          guestCount: reservation.guests,
        });
        await prisma.syncedHostifyReservation.update({
          where: { id: existing.id },
          data: {
            status: reservation.status,
            checkIn,
            checkOut,
            guests: reservation.guests,
            cleanId: clean.id,
          },
        });
        continue;
      }

      await prisma.syncedHostifyReservation.update({
        where: { id: existing.id },
        data: {
          status: reservation.status,
          checkIn,
          checkOut,
          guests: reservation.guests,
          cancelled: outcome === "cancelled",
        },
      });
      // Only a still-PENDING clean is ours to move or cancel -- one already
      // in progress or completed reflects real work done against the old
      // booking state.
      if (existing.clean && existing.clean.status === "PENDING") {
        if (outcome === "cancelled") {
          await prisma.clean.update({ where: { id: existing.clean.id }, data: { status: "CANCELLED" } });
          await logAudit({
            actorId: triggeredById,
            entityType: "Clean",
            entityId: existing.clean.id,
            summary: `Cancelled -- Hostify reservation status changed to "${reservation.status}"`,
          });
        } else {
          await prisma.clean.update({ where: { id: existing.clean.id }, data: { scheduledFor: checkOut } });
          await logAudit({
            actorId: triggeredById,
            entityType: "Clean",
            entityId: existing.clean.id,
            summary: `Rescheduled to ${formatScheduledFor(checkOut)} (Hostify sync)`,
          });
        }
      }
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { hostifyLastSyncedAt: new Date(), hostifyLastSyncError: null },
    });
  } catch (err) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { hostifyLastSyncError: describeSyncError(err) },
    });
  }
}
