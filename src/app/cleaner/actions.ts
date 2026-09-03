"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { savePropertyPhotos } from "@/lib/uploads";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Every action here re-checks that the clean belongs to the caller. A server
// action is reachable by direct POST, not just through the UI, so the page
// having rendered the button is not the authorisation.
async function ownCleanOrThrow(cleanId: string, userId: string) {
  const clean = await prisma.clean.findFirst({
    where: { id: cleanId, assignedToId: userId },
  });
  if (!clean) throw new Error("Clean not found");
  return clean;
}

// Before/after shots go under the property's own photo folder, so the single
// per-property check in /api/photos covers them without a second rule.
async function stagedPhotoCreates(propertyId: string, formData: FormData) {
  const groups: { field: string; stage: "BEFORE" | "AFTER" }[] = [
    { field: "beforePhotos", stage: "BEFORE" },
    { field: "afterPhotos", stage: "AFTER" },
  ];

  const creates: { path: string; stage: "BEFORE" | "AFTER" }[] = [];
  for (const { field, stage } of groups) {
    const files = formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) continue;
    const paths = await savePropertyPhotos(propertyId, files);
    creates.push(...paths.map((path) => ({ path, stage })));
  }
  return creates;
}

export async function checkInClean(cleanId: string) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "PENDING") {
    throw new Error("This clean has already been started.");
  }

  await prisma.clean.update({
    where: { id: cleanId },
    data: { status: "IN_PROGRESS", arrivedAt: new Date() },
  });

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
}

export async function completeClean(cleanId: string, formData: FormData) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "IN_PROGRESS" || !clean.arrivedAt) {
    throw new Error("Check in before checking out.");
  }

  const note = str(formData, "note");
  if (!note) throw new Error("Add a note about the turnover before checking out.");

  // Files are written to disk before the transaction opens: writing them
  // inside would hold the transaction open for the length of the upload, and
  // an orphaned file on disk is a much cheaper failure than a half-written
  // clean record.
  const photos = await stagedPhotoCreates(clean.propertyId, formData);

  await prisma.$transaction([
    prisma.cleanLog.create({
      data: {
        cleanId,
        recordedById: session.user.id,
        note,
        // Carried over from check-in, which is the moment that actually
        // matters -- the Clean row keeps it because the log doesn't exist yet.
        arrivedAt: clean.arrivedAt,
        departedAt: new Date(),
        photos: { create: photos },
      },
    }),
    prisma.clean.update({ where: { id: cleanId }, data: { status: "COMPLETED" } }),
  ]);

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/cleans");
  revalidatePath(`/admin/cleans/${cleanId}`);
}
