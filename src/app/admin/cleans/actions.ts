"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { createCleanRecord } from "@/lib/cleans";

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
  await requireStaff();

  const scheduledFor = dateTime(formData, "scheduledFor");
  const status = str(formData, "status");

  await prisma.clean.update({
    where: { id },
    data: {
      assignedToId: str(formData, "assignedToId"),
      scheduledFor,
      guestCount: int(formData, "guestCount"),
      instructions: str(formData, "instructions"),
      // Only PENDING/CANCELLED are settable by staff. IN_PROGRESS and
      // COMPLETED are owned by the cleaner's check-in/check-out, and letting
      // an edit form set them would leave a COMPLETED clean with no log.
      ...(status === "PENDING" || status === "CANCELLED" ? { status } : {}),
    },
  });

  revalidatePath("/admin/cleans");
  revalidatePath(`/admin/cleans/${id}`);
  revalidatePath("/cleaner");
  redirect(`/admin/cleans/${id}`);
}

export async function deleteClean(id: string) {
  await requireStaff();

  await prisma.clean.delete({ where: { id } });

  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
  redirect("/admin/cleans");
}
