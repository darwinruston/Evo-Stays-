"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { createCleanRecord, CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { propertyDisplayName } from "@/lib/address";
import { formatScheduledFor } from "@/lib/schedule";
import { logAudit } from "@/lib/audit";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// <input type="datetime-local"> submits "YYYY-MM-DDTHH:mm" with no zone, so
// `new Date(...)` reads it in the server's local time -- which is what we
// want, since the whole app schedules in local time.
function dateTime(formData: FormData, key: string): Date | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createClean(formData: FormData) {
  const session = await requireStaff();

  const propertyId = str(formData, "propertyId");
  if (!propertyId) throw new Error("Property is required");

  const scheduledFor = dateTime(formData, "scheduledFor");
  // Blank assignee means "pick someone sensible" -- omitting assignedToId
  // from the input is what tells createCleanRecord to auto-assign.
  const assignedToId = str(formData, "assignedToId");

  const clean = await createCleanRecord({
    propertyId,
    createdById: session.user.id,
    scheduledFor,
    guestCount: int(formData, "guestCount"),
    instructions: str(formData, "instructions"),
    ...(assignedToId ? { assignedToId } : {}),
  });

  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
  redirect(`/admin/cleans/${clean.id}`);
}

export async function updateClean(id: string, formData: FormData) {
  const session = await requireStaff();

  const scheduledFor = dateTime(formData, "scheduledFor");
  const status = str(formData, "status");

  const before = await prisma.clean.findUniqueOrThrow({
    where: { id },
    include: { assignedTo: { select: { name: true } } },
  });

  // Staff can cancel a clean from PENDING or IN_PROGRESS (e.g. a cleaner got
  // called away mid-visit and it's stuck), or reopen a CANCELLED one back to
  // PENDING. They can never set IN_PROGRESS or move a COMPLETED/IN_PROGRESS
  // clean back to PENDING themselves -- IN_PROGRESS already has a CleanLog
  // from check-in, and resetting to PENDING would orphan it (the cleaner's
  // next check-in would collide with it, since a clean has at most one log).
  const allowedStatusChange =
    (status === "CANCELLED" && before.status !== "COMPLETED") ||
    (status === "PENDING" && (before.status === "PENDING" || before.status === "CANCELLED"));

  const after = await prisma.clean.update({
    where: { id },
    data: {
      assignedToId: str(formData, "assignedToId"),
      scheduledFor,
      guestCount: int(formData, "guestCount"),
      instructions: str(formData, "instructions"),
      ...(allowedStatusChange ? { status } : {}),
    },
    include: { assignedTo: { select: { name: true } } },
  });

  // Three separate rows rather than one combined summary -- an edit can
  // change more than one of these at once, and each is independently
  // meaningful in the activity list.
  if (before.assignedToId !== after.assignedToId) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Clean",
      entityId: id,
      summary: `Reassigned from ${before.assignedTo?.name ?? "Unassigned"} to ${after.assignedTo?.name ?? "Unassigned"}`,
    });
  }
  if (before.scheduledFor?.getTime() !== after.scheduledFor?.getTime()) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Clean",
      entityId: id,
      summary: `Rescheduled from ${before.scheduledFor ? formatScheduledFor(before.scheduledFor) : "unscheduled"} to ${after.scheduledFor ? formatScheduledFor(after.scheduledFor) : "unscheduled"}`,
    });
  }
  if (before.status !== after.status) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Clean",
      entityId: id,
      summary: `Status changed from ${CLEAN_STATUS_LABELS[before.status]} to ${CLEAN_STATUS_LABELS[after.status]}`,
    });
  }

  revalidatePath("/admin/cleans");
  revalidatePath(`/admin/cleans/${id}`);
  revalidatePath("/cleaner");
  redirect(`/admin/cleans/${id}`);
}

export async function deleteClean(id: string) {
  const session = await requireStaff();

  // Fetched before deleting so the audit summary can stand on its own --
  // entityId survives the delete, but a join to look this back up wouldn't.
  const clean = await prisma.clean.findUniqueOrThrow({
    where: { id },
    include: {
      property: { select: { name: true, address: true } },
      assignedTo: { select: { name: true } },
    },
  });

  await prisma.clean.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    entityType: "Clean",
    entityId: id,
    summary: `Deleted — ${propertyDisplayName(clean.property)}, ${clean.scheduledFor ? formatScheduledFor(clean.scheduledFor) : "unscheduled"}, was assigned to ${clean.assignedTo?.name ?? "Unassigned"}`,
  });

  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
  redirect("/admin/cleans");
}
