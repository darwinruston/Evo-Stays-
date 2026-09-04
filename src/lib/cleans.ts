import type { CleanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { autoAssignCleaner } from "@/lib/autoAssign";

// The actual "make a Clean row" step, shared by the admin create-clean form
// (src/app/admin/cleans/actions.ts) and iCal sync (src/lib/icalSync.ts) --
// the form is redirect-shaped (FormData in, page navigation out), which a
// sync loop processing several bookings at once can't call directly. Omit
// assignedToId (rather than passing null) to auto-assign via the same
// familiarity/workload heuristic either caller would otherwise duplicate.
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
  });
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
