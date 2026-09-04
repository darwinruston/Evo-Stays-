"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { savePropertyPhotos, saveLaundryPhoto } from "@/lib/uploads";
import { bandToOnHandQty, type StockLevelBand } from "@/lib/stock";
import type { LaundryLoadFormState } from "@/components/LaundryLoadWizard";

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
    include: { log: { include: { photos: true, stockUsage: true } } },
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

// Fetches this property's configured par levels -- what the stock step (and
// the completeClean guard below) checks the cleaner's counts against.
async function configuredStockItemIds(propertyId: string): Promise<string[]> {
  const levels = await prisma.propertyStockLevel.findMany({
    where: { propertyId },
    select: { stockItemId: true },
  });
  return levels.map((l) => l.stockItemId);
}

const STOCK_BANDS: StockLevelBand[] = ["high", "medium", "low", "none"];

// One item, one tap: the cleaner picks (or confirms a pre-highlighted
// prediction of) a High/Medium/Low/None level rather than typing a count --
// deliberately not asking for an exact number on site, since that's the
// hassle this replaced. The band becomes a representative onHandQty via
// bandToOnHandQty so the rest of the app (par-level editing, the low-stock
// list, the dashboard) keeps working in numbers underneath.
//
// No separate "restocked" figure: whatever band is picked is treated as the
// level right now, whether that's because nothing was used or because the
// cleaner topped it up from what they carry. Keeping a distinct restock
// count would mean typing a second number, which is exactly the friction
// this flow is for avoiding.
export async function recordStockLevel(cleanId: string, stockItemId: string, formData: FormData) {
  const session = await requireCleaner();
  const clean = await ownCleanOrThrow(cleanId, session.user.id);

  if (clean.status !== "IN_PROGRESS" || !clean.log) {
    throw new Error("Check in before recording stock.");
  }

  const level = await prisma.propertyStockLevel.findFirst({
    where: { propertyId: clean.propertyId, stockItemId },
  });
  if (!level) throw new Error("That item isn't configured on this property.");

  if (clean.log.stockUsage.some((u) => u.stockItemId === stockItemId)) {
    throw new Error("That item has already been recorded for this clean.");
  }

  const band = formData.get("band");
  if (typeof band !== "string" || !STOCK_BANDS.includes(band as StockLevelBand)) {
    throw new Error("Pick a level.");
  }

  const onHandQty = bandToOnHandQty(band as StockLevelBand, level.parQty);

  await prisma.$transaction([
    prisma.stockUsageLog.create({
      data: { logId: clean.log.id, stockItemId, countedQty: onHandQty },
    }),
    prisma.propertyStockLevel.update({ where: { id: level.id }, data: { onHandQty } }),
  ]);

  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/properties/${clean.propertyId}`);
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

  const itemIds = await configuredStockItemIds(clean.propertyId);
  const recorded = new Set(clean.log.stockUsage.map((u) => u.stockItemId));
  if (itemIds.some((id) => !recorded.has(id))) {
    throw new Error("Stock counts are needed before checking out.");
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

// Logging a laundrette drop-off -- one load can cover linen from several of
// this cleaner's own completed visits (see LaundryLoad in schema.prisma),
// so this isn't scoped to a single Clean the way the actions above are.
// Mirrors src/app/admin/laundry/actions.ts's createLaundryLoad, but every
// requested visit must belong to THIS cleaner -- re-validated here rather
// than trusted from the submitted checkboxes.
//
// Returns an error to display inline (via useActionState in
// LaundryLoadWizard) instead of throwing -- a throw would surface as an
// uncaught exception and wipe out everything picked in the wizard so far.
export async function createLaundryLoad(
  _prevState: LaundryLoadFormState,
  formData: FormData,
): Promise<LaundryLoadFormState> {
  const session = await requireCleaner();

  const requestedIds = formData
    .getAll("cleanLogIds")
    .filter((v): v is string => typeof v === "string");
  if (requestedIds.length === 0) return { error: "Pick at least one clean." };

  const rawCost = str(formData, "cost");
  const cost = rawCost === null ? NaN : Number.parseFloat(rawCost);
  if (!Number.isFinite(cost) || cost < 0) return { error: "Enter a valid cost." };

  const rawFacilityId = str(formData, "facilityId");
  const facility = rawFacilityId
    ? await prisma.laundryFacility.findUnique({ where: { id: rawFacilityId }, select: { id: true } })
    : null;
  if (!facility) return { error: "Pick which launderette this went to." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Upload a photo of the ticket." };

  const eligible = await prisma.cleanLog.findMany({
    where: {
      id: { in: requestedIds },
      laundryLoadId: null,
      arrivedAt: { not: null },
      departedAt: { not: null },
      clean: { status: "COMPLETED", assignedToId: session.user.id },
    },
    select: { id: true },
  });
  if (eligible.length === 0) return { error: "None of the selected visits are eligible." };

  // Generated up front so the photo can be saved under {id}/{filename} and
  // the whole row written in one create() -- see saveLaundryPhoto.
  const laundryLoadId = randomUUID();
  const receiptPath = await saveLaundryPhoto(laundryLoadId, photo);

  await prisma.laundryLoad.create({
    data: {
      id: laundryLoadId,
      cost,
      facilityId: facility.id,
      receiptPath,
      recordedById: session.user.id,
      logs: { connect: eligible.map((l) => ({ id: l.id })) },
    },
  });

  revalidatePath("/cleaner/laundry");
  revalidatePath("/admin/laundry");
  return {};
}
