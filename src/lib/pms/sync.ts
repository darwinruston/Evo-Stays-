import type { ScopedPrismaClient } from "@/lib/prisma";
import { getPmsAdapter } from "@/lib/pms/registry";
import { decryptPmsCredentials } from "@/lib/pms/credentials";
import { PmsAuthError } from "@/lib/pms/errors";
import type { PmsAdapter } from "@/lib/pms/types";
import { createCleanRecord } from "@/lib/cleans";
import { formatScheduledFor, sameCalendarDay } from "@/lib/schedule";
import { logAudit } from "@/lib/audit";
import {
  notify,
  staffUserIds,
  newCleanNotices,
  cleanRescheduledNotice,
  cleanCancelledNotice,
  type NotificationInput,
} from "@/lib/notify";

// A reservation that checked out this recently is still worth reconciling
// (a late cancellation, say) -- older than that is outside anything a
// realistic syncHorizonDays would care about, so there's no point paying for
// an ever-growing full-history fetch the way an iCal feed never requires.
const LOOKBACK_DAYS = 7;

// Node's fetch throws a bare `TypeError: fetch failed` for anything at the
// network layer (DNS, connection refused, TLS) -- accurate, but meaningless
// to whoever's staring at it on the property page. Translated here into
// something that tells staff what to actually do about it.
function describeSyncError(err: unknown, adapter: PmsAdapter): string {
  if (err instanceof PmsAuthError) {
    return `${adapter.displayName} rejected the credentials (${err.message}) — check them on the client.`;
  }
  if (err instanceof TypeError && err.message === "fetch failed") {
    return `Couldn't reach ${adapter.displayName} — check your connection and try again shortly.`;
  }
  return err instanceof Error ? err.message : `Couldn't reach ${adapter.displayName}`;
}

// One pass over a single Property's linked PMS listing: fetch its
// reservations via that property's connected provider adapter, upsert a
// SyncedPmsReservation per reservation id (keyed on
// [propertyId, externalReservationId], so re-running this is idempotent),
// and create/update/cancel the Clean each one drives. Mirrors syncCalendarFeed
// in src/lib/icalSync.ts as closely as the data differs -- never throws, a
// fetch/decrypt/API failure is recorded as Property.pmsLastSyncError instead.
export async function syncPmsListing(
  db: ScopedPrismaClient,
  propertyId: string,
  triggeredById: string,
): Promise<void> {
  const property = await db.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: {
      pmsListingId: true,
      syncHorizonDays: true,
      nickname: true,
      name: true,
      address: true,
      client: { select: { pmsProvider: true, pmsCredentials: true } },
    },
  });
  const propertyRef = { nickname: property.nickname, name: property.name, address: property.address };

  // Defence in depth -- the action calling this already checks both, but a
  // property can be reached here from the unattended scheduler too, which
  // has no form to validate ahead of time.
  if (property.pmsListingId === null) {
    await db.property.update({
      where: { id: propertyId },
      data: { pmsLastSyncError: "No PMS listing configured on this property" },
    });
    return;
  }
  if (!property.client.pmsProvider || !property.client.pmsCredentials) {
    await db.property.update({
      where: { id: propertyId },
      data: { pmsLastSyncError: "No PMS connected on this client" },
    });
    return;
  }

  const adapter = getPmsAdapter(property.client.pmsProvider);
  const horizon = property.syncHorizonDays;
  const cutoff = horizon !== null ? new Date(Date.now() + horizon * 24 * 60 * 60 * 1000) : null;
  const lookback = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Collected and sent as one batch at the end -- same reasoning as the
  // matching comment in syncCalendarFeed (src/lib/icalSync.ts).
  const notices: NotificationInput[] = [];
  const staffIds = await staffUserIds(db);

  try {
    const credentials = decryptPmsCredentials(property.client.pmsCredentials);
    const reservations = await adapter.fetchReservations(credentials, property.pmsListingId, lookback, cutoff);

    for (const reservation of reservations) {
      const { checkIn, checkOut, outcome } = reservation;

      const existing = await db.syncedPmsReservation.findUnique({
        where: {
          propertyId_externalReservationId: { propertyId, externalReservationId: reservation.externalId },
        },
        include: { clean: true },
      });

      // First sighting of this reservation. A pending/cancelled one is only
      // tracked -- see each adapter's outcome classification -- so a later
      // flip to active is seen as a change below, not mistaken for brand new.
      if (!existing) {
        if (outcome === "active" && (cutoff === null || checkOut <= cutoff)) {
          const clean = await createCleanRecord(db, {
            propertyId,
            createdById: triggeredById,
            scheduledFor: checkOut,
            guestCount: reservation.guests,
          });
          notices.push(...newCleanNotices(clean, { staffIds }));
          await db.syncedPmsReservation.create({
            data: {
              organizationId: db.organizationId,
              propertyId,
              externalReservationId: reservation.externalId,
              status: reservation.status,
              checkIn,
              checkOut,
              guests: reservation.guests,
              cleanId: clean.id,
            },
          });
        } else {
          await db.syncedPmsReservation.create({
            data: {
              organizationId: db.organizationId,
              propertyId,
              externalReservationId: reservation.externalId,
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

      // First confirmation (pending -> active) with no Clean yet behaves
      // like a brand-new booking.
      if (outcome === "active" && !existing.clean && (cutoff === null || checkOut <= cutoff)) {
        const clean = await createCleanRecord(db, {
          propertyId,
          createdById: triggeredById,
          scheduledFor: checkOut,
          guestCount: reservation.guests,
        });
        notices.push(...newCleanNotices(clean, { staffIds }));
        await db.syncedPmsReservation.update({
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

      await db.syncedPmsReservation.update({
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
          await db.clean.update({ where: { id: existing.clean.id }, data: { status: "CANCELLED" } });
          await logAudit(db, {
            actorId: triggeredById,
            entityType: "Clean",
            entityId: existing.clean.id,
            summary: `Cancelled — ${adapter.displayName} reservation status changed to "${reservation.status}"`,
          });
          if (existing.clean.assignedToId) {
            notices.push(
              ...cleanCancelledNotice(
                existing.clean.assignedToId,
                { id: existing.clean.id, scheduledFor: existing.clean.scheduledFor, property: propertyRef },
                { reason: "The booking was cancelled." },
              ),
            );
          }
        } else if (existing.clean.scheduledFor?.getTime() !== checkOut.getTime()) {
          // Only when the checkout itself moved -- the "changed" test above
          // also fires on a check-in or status change that leaves the clean
          // where it is. atRiskNotifiedAt cleared on a day change for the
          // same reason as in syncCalendarFeed.
          await db.clean.update({
            where: { id: existing.clean.id },
            data: {
              scheduledFor: checkOut,
              ...(sameCalendarDay(existing.clean.scheduledFor, checkOut) ? {} : { atRiskNotifiedAt: null }),
            },
          });
          await logAudit(db, {
            actorId: triggeredById,
            entityType: "Clean",
            entityId: existing.clean.id,
            summary: `Rescheduled to ${formatScheduledFor(checkOut)} (${adapter.displayName} sync)`,
          });
          if (existing.clean.assignedToId) {
            notices.push(
              ...cleanRescheduledNotice(
                existing.clean.assignedToId,
                { id: existing.clean.id, scheduledFor: checkOut, property: propertyRef },
                existing.clean.scheduledFor,
              ),
            );
          }
        }
      }
    }

    await db.property.update({
      where: { id: propertyId },
      data: { pmsLastSyncedAt: new Date(), pmsLastSyncError: null },
    });
  } catch (err) {
    await db.property.update({
      where: { id: propertyId },
      data: { pmsLastSyncError: describeSyncError(err, adapter) },
    });
  } finally {
    await notify(db, notices);
  }
}
