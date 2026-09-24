import type { CleanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { autoAssignCleaner } from "@/lib/autoAssign";
import { toIsoDate } from "@/lib/schedule";

// The actual "make a Clean row" step, shared by the admin create-clean form
// (src/app/admin/cleans/actions.ts) and iCal sync (src/lib/icalSync.ts) --
// the form is redirect-shaped (FormData in, page navigation out), which a
// sync loop processing several bookings at once can't call directly. Omit
// assignedToId (rather than passing null) to auto-assign via the same
// familiarity/workload heuristic either caller would otherwise duplicate.
//
// Returns the property's name/address alongside the clean so a caller can
// build its notification (see newCleanNotices in src/lib/notify.ts) without
// a second lookup. Doesn't notify on its own: the admin form notifies
// straight away, but a sync collects every clean it creates and sends one
// batch at the end, which only the caller knows how to do.
export async function createCleanRecord(input: {
  propertyId: string;
  createdById: string;
  scheduledFor: Date | null;
  guestCount?: number | null;
  instructions?: string | null;
  assignedToId?: string;
}) {
  const assignedToId =
    input.assignedToId ?? (await autoAssignCleaner(input.propertyId, input.scheduledFor));

  return prisma.clean.create({
    data: {
      propertyId: input.propertyId,
      assignedToId,
      createdById: input.createdById,
      scheduledFor: input.scheduledFor,
      guestCount: input.guestCount ?? null,
      instructions: input.instructions ?? null,
    },
    include: { property: { select: { name: true, address: true } } },
  });
}

// Shared by the create and edit clean pages -- every cleaner plus the days
// they've blocked (see CleanerUnavailability in schema.prisma), for
// CleanForm's live "this cleaner is unavailable that day" warning.
export async function getCleanerOptions() {
  const cleaners = await prisma.user.findMany({
    where: { role: "CLEANER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unavailability: { select: { date: true } } },
  });
  return cleaners.map((c) => ({
    id: c.id,
    name: c.name,
    unavailableDates: c.unavailability.map((u) => toIsoDate(u.date)),
  }));
}

export const CLEAN_STATUS_LABELS: Record<CleanStatus, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// "Finished" for scheduling purposes: a clean that will never be worked
// again, so it belongs in history rather than showing as overdue. Used by
// groupCleansByTime.
export function isCleanFinished(status: CleanStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}
