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
// having rendered the button is not the authorisation. The same goes for the
// stage checks below: the turnover is a forced march in the UI, and these
// make it one in the data too rather than only on screen.
async function ownCleanOrThrow(cleanId: string, userId: string) {
  const clean = await prisma.clean.findFirst({
    where: { id: cleanId, assignedToId: userId },
    include: { log: { include: { photos: true } } },
  });
  if (!clean) throw new Error("Clean not found");
  return clean;
}

// Arriving on site. Creates the visit record straight away rather than at
// check-out, so the before photos taken in the next step have somewhere to
// live -- a log with departedAt still null is a visit in progress.
export async function checkInClean(cleanId: string) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "PENDING") {
    throw new Error("This clean has already been started.");
  }

  const arrivedAt = new Date();
  await prisma.$transaction([
    prisma.clean.update({
      where: { id: cleanId },
      data: { status: "IN_PROGRESS", arrivedAt },
    }),
    prisma.cleanLog.create({
      data: { cleanId, recordedById: session.user.id, arrivedAt },
    }),
  ]);

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
}

// One stage's photos. Before and after go through the same action because
// the only thing that differs is which stage they're filed under and which
// step has to have been reached first.
export async function uploadCleanPhotos(
  cleanId: string,
  stage: "BEFORE" | "AFTER",
  formData: FormData,
) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "IN_PROGRESS") {
    throw new Error("Check in before adding photos.");
  }

  // IN_PROGRESS means someone is standing in the property, so the visit
  // record must exist for the photos to hang off. Creating it here if it's
  // missing keeps a cleaner from being stranded mid-turnover by a clean that
  // reached IN_PROGRESS without one -- which is what every clean checked in
  // before the log moved to check-in time looks like.
  const log =
    clean.log ??
    (await prisma.cleanLog.create({
      data: { cleanId, recordedById: session.user.id, arrivedAt: clean.arrivedAt },
      include: { photos: true },
    }));

  const already = log.photos.some((p) => p.stage === stage);
  if (already) {
    throw new Error(`The ${stage.toLowerCase()} photos for this clean are already recorded.`);
  }
  // After photos can't be filed before the before photos exist -- otherwise
  // a direct POST could jump the queue the UI is enforcing.
  if (stage === "AFTER" && !log.photos.some((p) => p.stage === "BEFORE")) {
    throw new Error("Add the before photos first.");
  }

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    throw new Error("Pick at least one photo.");
  }

  // Stored under the property's own folder, so the single per-property check
  // in /api/photos covers these without a second rule.
  const paths = await savePropertyPhotos(clean.propertyId, files);
  await prisma.cleanPhoto.createMany({
    data: paths.map((path) => ({ logId: log.id, path, stage })),
  });

  revalidatePath(`/cleaner/cleans/${cleanId}`);
}

export async function completeClean(cleanId: string, formData: FormData) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "IN_PROGRESS" || !clean.log) {
    throw new Error("Check in before checking out.");
  }

  const stages = new Set(clean.log.photos.map((p) => p.stage));
  if (!stages.has("BEFORE") || !stages.has("AFTER")) {
    throw new Error("Both before and after photos are needed before checking out.");
  }

  const note = str(formData, "note");
  if (!note) throw new Error("Add a note about the turnover before checking out.");

  await prisma.$transaction([
    prisma.cleanLog.update({
      where: { id: clean.log.id },
      data: { note, departedAt: new Date() },
    }),
    prisma.clean.update({ where: { id: cleanId }, data: { status: "COMPLETED" } }),
  ]);

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/cleans");
  revalidatePath(`/admin/cleans/${cleanId}`);
}
