import * as ical from "node-ical";
import { prisma } from "@/lib/prisma";
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

// One pass over a single PropertyCalendarFeed: fetch its iCal URL, upsert a
// SyncedBookingEvent per VEVENT (keyed on [feedId, externalUid] so re-running
// this is idempotent), and create/update/cancel the Clean each one drives.
// Never throws -- a fetch/parse failure is recorded as feed.lastSyncError
// instead, since "Sync now" is a button a staff member clicks and the
// property page just needs something to show, not an exception to catch.
export async function syncCalendarFeed(feedId: string, triggeredById: string): Promise<void> {
  const feed = await prisma.propertyCalendarFeed.findUniqueOrThrow({
    where: { id: feedId },
    include: { property: { select: { syncHorizonDays: true, name: true, address: true } } },
  });
  const property = { name: feed.property.name, address: feed.property.address };

  // A booking checking out further out than this is skipped rather than
  // turned into a clean -- re-evaluated on every later sync, so it's picked
  // up for real once it's within range. Property-wide (not per feed): a
  // property listed on several platforms wants one consistent lookahead.
  const horizon = feed.property.syncHorizonDays;
  const cutoff = horizon !== null ? new Date(Date.now() + horizon * 24 * 60 * 60 * 1000) : null;

  // Everything this pass has to tell anyone, sent as one batch at the end
  // (see notify in src/lib/notify.ts) -- including after a mid-run failure,
  // since whatever cleans were already created or changed before it are
  // real and their cleaners still need to know.
  const notices: NotificationInput[] = [];
  const staffIds = await staffUserIds();

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
        if (cutoff !== null && checkOut > cutoff) continue;
        const clean = await createCleanRecord({
          propertyId: feed.propertyId,
          createdById: triggeredById,
          scheduledFor: checkOut,
        });
        notices.push(...newCleanNotices(clean, { staffIds }));
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
      // or completed reflects real work done against the old date. And only
      // if the checkout itself moved: a change to just the check-in leaves
      // the clean exactly where it was.
      if (
        existing.clean &&
        existing.clean.status === "PENDING" &&
        existing.clean.scheduledFor?.getTime() !== checkOut.getTime()
      ) {
        await prisma.clean.update({
          where: { id: existing.clean.id },
          // A new day is a new deadline -- clear any at-risk alert already
          // sent for the old one (see checkAtRiskTurnovers).
          data: {
            scheduledFor: checkOut,
            ...(sameCalendarDay(existing.clean.scheduledFor, checkOut) ? {} : { atRiskNotifiedAt: null }),
          },
        });
        await logAudit({
          actorId: triggeredById,
          entityType: "Clean",
          entityId: existing.clean.id,
          summary: `Rescheduled to ${formatScheduledFor(checkOut)} (${feed.label} calendar sync)`,
        });
        if (existing.clean.assignedToId) {
          notices.push(
            ...cleanRescheduledNotice(
              existing.clean.assignedToId,
              { id: existing.clean.id, scheduledFor: checkOut, property },
              existing.clean.scheduledFor,
            ),
          );
        }
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
        await logAudit({
          actorId: triggeredById,
          entityType: "Clean",
          entityId: event.clean.id,
          summary: `Cancelled — booking no longer on the ${feed.label} calendar`,
        });
        if (event.clean.assignedToId) {
          notices.push(
            ...cleanCancelledNotice(
              event.clean.assignedToId,
              { id: event.clean.id, scheduledFor: event.clean.scheduledFor, property },
              { reason: "The booking was cancelled." },
            ),
          );
        }
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
  } finally {
    await notify(notices);
  }
}
