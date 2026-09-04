import * as ical from "node-ical";
import { prisma } from "@/lib/prisma";
import { createCleanRecord } from "@/lib/cleans";

// One pass over a single PropertyCalendarFeed: fetch its iCal URL, upsert a
// SyncedBookingEvent per VEVENT (keyed on [feedId, externalUid] so re-running
// this is idempotent), and create/update/cancel the Clean each one drives.
// Never throws -- a fetch/parse failure is recorded as feed.lastSyncError
// instead, since "Sync now" is a button a staff member clicks and the
// property page just needs something to show, not an exception to catch.
export async function syncCalendarFeed(feedId: string, triggeredById: string): Promise<void> {
  const feed = await prisma.propertyCalendarFeed.findUniqueOrThrow({ where: { id: feedId } });

  try {
    const parsed = await ical.async.fromURL(feed.url);
    const events = Object.values(parsed).filter(
      (c): c is ical.VEvent => c?.type === "VEVENT" && !!c.uid && !!c.start && !!c.end,
    );

    const seenUids = new Set<string>();

    for (const event of events) {
      seenUids.add(event.uid);
      const checkIn = new Date(event.start);
      const checkOut = new Date(event.end as Date);

      const existing = await prisma.syncedBookingEvent.findUnique({
        where: { feedId_externalUid: { feedId, externalUid: event.uid } },
        include: { clean: true },
      });

      if (!existing) {
        const clean = await createCleanRecord({
          propertyId: feed.propertyId,
          createdById: triggeredById,
          scheduledFor: checkOut,
        });
        await prisma.syncedBookingEvent.create({
          data: { feedId, externalUid: event.uid, checkIn, checkOut, cleanId: clean.id },
        });
        continue;
      }

      const changed =
        existing.checkIn.getTime() !== checkIn.getTime() ||
        existing.checkOut.getTime() !== checkOut.getTime() ||
        existing.cancelled;
      if (!changed) continue;

      await prisma.syncedBookingEvent.update({
        where: { id: existing.id },
        data: { checkIn, checkOut, cancelled: false },
      });
      // Only a still-PENDING clean is ours to move -- one already in progress
      // or completed reflects real work done against the old date.
      if (existing.clean && existing.clean.status === "PENDING") {
        await prisma.clean.update({
          where: { id: existing.clean.id },
          data: { scheduledFor: checkOut },
        });
      }
    }

    // Anything previously synced from this feed that's no longer in it --
    // the guest cancelled. notIn: [] (an empty feed) correctly matches every
    // row rather than excluding nothing.
    const disappeared = await prisma.syncedBookingEvent.findMany({
      where: { feedId, cancelled: false, externalUid: { notIn: [...seenUids] } },
      include: { clean: true },
    });
    for (const event of disappeared) {
      await prisma.syncedBookingEvent.update({
        where: { id: event.id },
        data: { cancelled: true },
      });
      if (event.clean && event.clean.status === "PENDING") {
        await prisma.clean.update({
          where: { id: event.clean.id },
          data: { status: "CANCELLED" },
        });
      }
    }

    await prisma.propertyCalendarFeed.update({
      where: { id: feedId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't read that calendar";
    await prisma.propertyCalendarFeed.update({
      where: { id: feedId },
      data: { lastSyncError: message },
    });
  }
}
