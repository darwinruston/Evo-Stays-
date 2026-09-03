import type { CleanStatus } from "@prisma/client";

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
