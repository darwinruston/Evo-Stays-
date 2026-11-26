import type { ScopedPrismaClient } from "@/lib/prisma";
import { createCleanRecord } from "@/lib/cleans";
import { occurrenceDate, SERIES_AHEAD_DAYS, CLEAN_FREQUENCY_LABELS } from "@/lib/cleanRepeat";
import { propertyDisplayName } from "@/lib/address";
import { formatScheduledFor } from "@/lib/schedule";
import { linenNoticesFor } from "@/lib/linenNotify";
import { notify, newCleanNotices, staffUserIds, type NotificationInput } from "@/lib/notify";

// Repeating cleans. A series holds the pattern; the cleans it makes are
// ordinary cleans, so each can be moved, reassigned, cancelled or deleted on
// its own without disturbing the others. The series only ever moves forward:
// a date it has already made is never made again.

type CreatedClean = Awaited<ReturnType<typeof createCleanRecord>>;

// Makes every clean of one series that now falls within the look-ahead.
async function fillSeries(db: ScopedPrismaClient, seriesId: string, now: Date): Promise<CreatedClean[]> {
  const series = await db.cleanSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.endedAt) return [];

  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + SERIES_AHEAD_DAYS + 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // The "until" date is a calendar day, included in full.
  const until = series.endsOn
    ? new Date(series.endsOn.getUTCFullYear(), series.endsOn.getUTCMonth(), series.endsOn.getUTCDate() + 1)
    : null;

  const created: CreatedClean[] = [];
  let index = series.nextIndex;
  for (;;) {
    const date = occurrenceDate(series.startAt, series.frequency, index);
    if (date >= horizon || (until && date >= until)) break;

    // Claimed before the clean is made, so the timer and a person pressing
    // save at the same moment cannot both make it.
    const claimed = await db.cleanSeries.updateMany({
      where: { id: series.id, nextIndex: index, endedAt: null },
      data: { nextIndex: index + 1 },
    });
    if (claimed.count !== 1) break;
    index += 1;

    // A start date in the past makes no cleans in the past.
    if (date < today) continue;

    const clean = await createCleanRecord(db, {
      propertyId: series.propertyId,
      createdById: series.createdById,
      scheduledFor: date,
      guestCount: series.guestCount,
      instructions: series.instructions,
      // Left out to let auto-assign choose for each date.
      ...(series.assignedToId ? { assignedToId: series.assignedToId } : {}),
    });
    await db.clean.update({ where: { id: clean.id }, data: { seriesId: series.id } });
    created.push(clean);
  }
  return created;
}

// Starts a series and makes its first run of cleans. Returns the first one.
// Each cleaner gets one message about the lot rather than one per date.
export async function startCleanSeries(
  db: ScopedPrismaClient,
  input: {
    propertyId: string;
    createdById: string;
    assignedToId: string | null;
    frequency: keyof typeof CLEAN_FREQUENCY_LABELS;
    startAt: Date;
    endsOn: Date | null;
    guestCount: number | null;
    instructions: string | null;
  },
  now = new Date(),
): Promise<{ firstCleanId: string | null; count: number }> {
  const series = await db.cleanSeries.create({ data: { organizationId: db.organizationId, ...input } });
  const cleans = await fillSeries(db, series.id, now);
  if (cleans.length === 0) return { firstCleanId: null, count: 0 };

  const every = CLEAN_FREQUENCY_LABELS[input.frequency].toLowerCase();
  const perCleaner = new Map<string, CreatedClean[]>();
  for (const clean of cleans) {
    if (!clean.assignedToId) continue;
    perCleaner.set(clean.assignedToId, [...(perCleaner.get(clean.assignedToId) ?? []), clean]);
  }
  const notices: NotificationInput[] = [...perCleaner].map(([userId, theirs]) => ({
    userId,
    kind: "CLEAN_ASSIGNED",
    title: `Repeating clean: ${propertyDisplayName(theirs[0].property)}`,
    body: `${CLEAN_FREQUENCY_LABELS[input.frequency]}. ${theirs.length} added to your calendar, the first ${formatScheduledFor(theirs[0].scheduledFor!)}.`,
    href: `/cleaner/cleans/${theirs[0].id}`,
  }));
  const unassigned = cleans.filter((c) => !c.assignedToId);
  if (unassigned.length > 0) {
    notices.push(
      ...(await staffUserIds(db)).map(
        (userId): NotificationInput => ({
          userId,
          kind: "CLEAN_NEEDS_CLEANER",
          title: `Needs a cleaner: ${propertyDisplayName(unassigned[0].property)}`,
          body: `${unassigned.length} of the cleans repeating ${every} have nobody on them.`,
          href: `/admin/cleans/${unassigned[0].id}/edit`,
        }),
      ),
    );
  }
  await notify(db, notices);
  return { firstCleanId: cleans[0].id, count: cleans.length };
}

// Run on the background timer: as time passes, each series gets its next dates.
export async function topUpCleanSeries(db: ScopedPrismaClient, now = new Date()): Promise<number> {
  const open = await db.cleanSeries.findMany({ where: { endedAt: null }, select: { id: true } });
  if (open.length === 0) return 0;
  const staffIds = await staffUserIds(db);
  let made = 0;
  for (const { id } of open) {
    const cleans = await fillSeries(db, id, now);
    made += cleans.length;
    await notify(db, cleans.flatMap((c) => newCleanNotices(c, { staffIds })));
  }
  return made;
}

// Ends a series from one of its cleans: that clean and everything before it
// stay, and the later ones nobody has started are removed. Returns how many.
export async function stopCleanSeries(db: ScopedPrismaClient, cleanId: string): Promise<number> {
  const from = await db.clean.findUnique({ where: { id: cleanId }, select: { seriesId: true, scheduledFor: true } });
  if (!from?.seriesId) return 0;
  await db.cleanSeries.update({ where: { id: from.seriesId }, data: { endedAt: new Date() } });

  const later = await db.clean.findMany({
    where: {
      seriesId: from.seriesId,
      id: { not: cleanId },
      status: "PENDING",
      scheduledFor: { gt: from.scheduledFor ?? new Date() },
    },
    include: { property: { select: { nickname: true, name: true, address: true } } },
  });
  if (later.length === 0) return 0;

  const notices: NotificationInput[] = [];
  for (const clean of later) notices.push(...(await linenNoticesFor(db, clean, null)));
  await db.clean.deleteMany({ where: { id: { in: later.map((c) => c.id) } } });

  const cleaners = [...new Set(later.map((c) => c.assignedToId).filter((id): id is string => !!id))];
  notices.push(
    ...cleaners.map(
      (userId): NotificationInput => ({
        userId,
        kind: "CLEAN_CANCELLED",
        title: `Repeating clean stopped: ${propertyDisplayName(later[0].property)}`,
        body: "The later dates have been taken off your calendar.",
        href: "/cleaner",
      }),
    ),
  );
  await notify(db, notices);
  return later.length;
}
