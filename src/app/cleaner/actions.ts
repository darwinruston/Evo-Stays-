"use server";

import { stockSuits } from "@/lib/dishwasherStock";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, type ScopedPrismaClient } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { assertModule, getOrgModules } from "@/lib/modules";
import { linenNoticesFor } from "@/lib/linenNotify";
import { notify } from "@/lib/notify";
import { savePropertyPhotos } from "@/lib/uploads";
import { photoProblem } from "@/lib/imageTypes";
import { bandToDb, isStockLevelBand } from "@/lib/stock";
import { dayBounds, parseIsoDate } from "@/lib/schedule";
import { plannedArrivalFor } from "@/lib/arrival";
import { parseTeamSize, TEAM_SIZE_MAX } from "@/lib/teamSize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actionResult";
import type { LaundryLoadFormState } from "@/components/LaundryLoadWizard";
import {
  createIssueRecord,
  parseIssueForm,
  IssueFormError,
  issueFormErrorState,
  type IssueFormState,
} from "@/lib/issueRecords";

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
function ownClean(db: ScopedPrismaClient, cleanId: string, userId: string) {
  return db.clean.findFirst({
    where: { id: cleanId, assignedToId: userId },
    include: { log: { include: { photos: true, stockUsage: true } } },
  });
}

// Said when the office has moved or removed the clean while the page was open.
const NOT_YOURS = "This clean is no longer on your list. It may have been moved to someone else.";

// The cleaner saying what time they'll get there. The time is on the clean's
// own day: they pick an hour and minute, not a date. Can be changed any
// number of times until they check in.
export async function confirmArrival(cleanId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "PENDING") return { error: "This clean has already been started." };
  if (!clean.scheduledFor) return { error: "This clean doesn't have a date yet." };

  const plannedArrivalAt = plannedArrivalFor(clean.scheduledFor, str(formData, "arrivalTime") ?? "");
  if (!plannedArrivalAt) return { error: "Enter the time you'll arrive." };

  await db.clean.update({ where: { id: cleanId }, data: { plannedArrivalAt } });
  // The linen company plans its window around this time.
  await notify(db, await linenNoticesFor(db, clean, { ...clean, plannedArrivalAt }));

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath(`/admin/cleans/${cleanId}`);
  revalidatePath("/admin/cleans");
  revalidatePath("/admin");
}

// Arriving on site. Creates the visit record straight away rather than at
// check-out, so the before photos taken in the next step have somewhere to
// live -- a log with departedAt still null is a visit in progress.
//
// Also where the cleaner says how many of them are cleaning (a helper or a
// whole team may arrive together): the hours are billed for everyone, see
// src/lib/invoices.ts. Left blank it is one person, as it always was.
export async function checkInClean(cleanId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "PENDING") {
    return { error: "This clean has already been started." };
  }
  const rawTeam = formData.get("teamSize");
  const teamSize = rawTeam === null ? 1 : parseTeamSize(rawTeam);
  if (teamSize === null) return { error: `The team can be 1 to ${TEAM_SIZE_MAX} people.` };

  const arrivedAt = new Date();
  // The clean and its brand-new log need to land together -- the scoped
  // `db` extension can't provide a real interactive transaction (each of its
  // calls opens its own, to carry the set_config), so this falls back to the
  // raw client's own $transaction, setting the RLS session variable by hand.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${session.user.organizationId}, TRUE)`;
    await tx.clean.update({
      where: { id: cleanId },
      data: { status: "IN_PROGRESS", arrivedAt },
    });
    await tx.cleanLog.create({
      data: {
        organizationId: session.user.organizationId,
        cleanId,
        recordedById: session.user.id,
        arrivedAt,
        teamSize,
      },
    });
  });

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
}

// Someone joined or left partway through. Only while the visit is in
// progress; staff can correct it afterwards (until it is invoiced).
export async function updateTeamSize(cleanId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "IN_PROGRESS" || !clean.log) return { error: "Check in first." };
  const teamSize = parseTeamSize(formData.get("teamSize"));
  if (teamSize === null) return { error: `The team can be 1 to ${TEAM_SIZE_MAX} people.` };
  if (teamSize === clean.log.teamSize) return;

  await db.cleanLog.update({ where: { id: clean.log.id }, data: { teamSize } });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Clean",
    entityId: cleanId,
    summary: `Team size changed from ${clean.log.teamSize} to ${teamSize}`,
  });

  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath(`/admin/cleans/${cleanId}`);
}

// One stage's photos. Before and after go through the same action because
// the only thing that differs is which stage they're filed under and which
// step has to have been reached first.
export async function uploadCleanPhotos(
  cleanId: string,
  stage: "BEFORE" | "AFTER",
  formData: FormData,
): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "IN_PROGRESS") {
    return { error: "Check in before adding photos." };
  }

  // IN_PROGRESS means someone is standing in the property, so the visit
  // record must exist for the photos to hang off. Creating it here if it's
  // missing keeps a cleaner from being stranded mid-turnover by a clean that
  // reached IN_PROGRESS without one -- which is what every clean checked in
  // before the log moved to check-in time looks like.
  const log =
    clean.log ??
    (await db.cleanLog.create({
      data: {
        organizationId: session.user.organizationId,
        cleanId,
        recordedById: session.user.id,
        arrivedAt: clean.arrivedAt,
      },
      include: { photos: true },
    }));

  const already = log.photos.some((p) => p.stage === stage);
  if (already) {
    return { error: `The ${stage.toLowerCase()} photos for this clean are already recorded.` };
  }
  // After photos can't be filed before the before photos exist -- otherwise
  // a direct POST could jump the queue the UI is enforcing.
  if (stage === "AFTER" && !log.photos.some((p) => p.stage === "BEFORE")) {
    return { error: "Add the before photos first." };
  }

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Pick at least one photo." };
  }

  // Stored under the property's own folder, so the single per-property check
  // in /api/photos covers these without a second rule.
  const problem = photoProblem(files);
  if (problem) return { error: problem };

  const paths = await savePropertyPhotos(clean.propertyId, files);
  await db.cleanPhoto.createMany({
    data: paths.map((path) => ({
      organizationId: session.user.organizationId,
      logId: log.id,
      path,
      stage,
    })),
  });

  revalidatePath(`/cleaner/cleans/${cleanId}`);
}

// Fetches this property's configured par levels -- what the stock step (and
// the completeClean guard below) checks the cleaner's counts against.
async function configuredStockItemIds(
  db: ScopedPrismaClient,
  propertyId: string,
  organizationId: string,
): Promise<string[]> {
  // A company that has switched stock tracking off has no stock step, so
  // nothing is owed before check-out whatever is still configured.
  if (!(await getOrgModules(organizationId)).stock) return [];
  const [property, levels] = await Promise.all([
    db.property.findUniqueOrThrow({ where: { id: propertyId } }),
    db.propertyStockLevel.findMany({
      where: { propertyId },
      select: { stockItemId: true, stockItem: { select: { name: true } } },
    }),
  ]);
  // The same list the cleaner is walked through (see stockSuits).
  return levels.filter((l) => stockSuits(l.stockItem.name, property)).map((l) => l.stockItemId);
}

// One item, one tap: the cleaner picks (or confirms a pre-highlighted
// prediction of, defaulting to the level as it was last left) a
// High/Medium/Low/None level rather than typing a count -- deliberately not
// asking for an exact number on site, since that's the hassle this
// replaced. The band is the stored fact, both here and on
// PropertyStockLevel -- no representative number invented underneath it.
//
// No separate "restocked" figure: whatever band is picked is treated as the
// level right now, whether that's because nothing was used or because the
// cleaner topped it up from what they carry. Keeping a distinct restock
// count would mean typing a second number, which is exactly the friction
// this flow is for avoiding.
export async function recordStockLevel(cleanId: string, stockItemId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  await assertModule(session.user.organizationId, "stock");
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "IN_PROGRESS" || !clean.log) {
    return { error: "Check in before recording stock." };
  }

  const level = await db.propertyStockLevel.findFirst({
    where: { propertyId: clean.propertyId, stockItemId },
  });
  if (!level) return { error: "That item is no longer on this property's stock list." };

  if (clean.log.stockUsage.some((u) => u.stockItemId === stockItemId)) {
    return { error: "That item has already been recorded for this clean." };
  }

  const band = formData.get("band");
  if (typeof band !== "string" || !isStockLevelBand(band)) {
    return { error: "Pick a level." };
  }
  const dbBand = bandToDb(band);

  // Same atomicity note as checkInClean above.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${session.user.organizationId}, TRUE)`;
    await tx.stockUsageLog.create({
      data: { organizationId: session.user.organizationId, logId: clean.log!.id, stockItemId, band: dbBand },
    });
    await tx.propertyStockLevel.update({ where: { id: level.id }, data: { band: dbBand } });
  });

  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/properties/${clean.propertyId}`);
}

export async function completeClean(cleanId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS };

  if (clean.status !== "IN_PROGRESS" || !clean.log) {
    return { error: "Check in before checking out." };
  }

  const stages = new Set(clean.log.photos.map((p) => p.stage));
  if (!stages.has("BEFORE") || !stages.has("AFTER")) {
    return { error: "Both before and after photos are needed before checking out." };
  }

  const itemIds = await configuredStockItemIds(db, clean.propertyId, session.user.organizationId);
  const recorded = new Set(clean.log.stockUsage.map((u) => u.stockItemId));
  if (itemIds.some((id) => !recorded.has(id))) {
    return { error: "Stock counts are needed before checking out." };
  }

  // Optional -- only worth writing when there's actually something to flag.
  const note = str(formData, "note");

  // Same atomicity note as checkInClean above.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${session.user.organizationId}, TRUE)`;
    await tx.cleanLog.update({
      where: { id: clean.log!.id },
      data: { note, departedAt: new Date() },
    });
    await tx.clean.update({ where: { id: cleanId }, data: { status: "COMPLETED" } });
  });

  revalidatePath("/cleaner");
  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/cleans");
  revalidatePath(`/admin/cleans/${cleanId}`);
}

// Flagging a problem found on site -- damage, something broken or missing, a
// guest's forgotten belongings. Only while checked in: that's when the
// cleaner is actually standing in the property looking at it, and it ties
// the report (and its photos) to this visit. Doesn't gate check-out --
// reporting is optional, and a turnover with nothing wrong shouldn't have
// an extra step.
//
// Returns its outcome for IssueForm's useActionState rather than throwing,
// so a rejected report keeps what was typed and says why inline.
export async function reportIssue(
  cleanId: string,
  prev: IssueFormState,
  formData: FormData,
): Promise<IssueFormState> {
  const { session, db } = await requireCleaner();
  const clean = await ownClean(db, cleanId, session.user.id);
  if (!clean) return { error: NOT_YOURS, attempt: (prev.attempt ?? 0) + 1 };

  if (clean.status !== "IN_PROGRESS") {
    return { error: "Check in before reporting a problem.", attempt: (prev.attempt ?? 0) + 1 };
  }

  try {
    await createIssueRecord(db, {
      propertyId: clean.propertyId,
      cleanId,
      reportedById: session.user.id,
      form: parseIssueForm(formData),
    });
  } catch (err) {
    if (err instanceof IssueFormError) return issueFormErrorState(err, formData, prev);
    throw err;
  }

  revalidatePath(`/cleaner/cleans/${cleanId}`);
  revalidatePath("/admin/issues");
  revalidatePath(`/admin/properties/${clean.propertyId}`);
  revalidatePath("/admin", "layout");
  return { sent: true, attempt: (prev.attempt ?? 0) + 1 };
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
  const { session, db } = await requireCleaner();
  if (!(await getOrgModules(session.user.organizationId)).laundry) {
    return { error: "Laundry isn't switched on for your company." };
  }

  const requestedIds = formData
    .getAll("cleanLogIds")
    .filter((v): v is string => typeof v === "string");
  if (requestedIds.length === 0) return { error: "Pick at least one clean." };

  const rawFacilityId = str(formData, "facilityId");
  const facility = rawFacilityId
    ? await db.laundryFacility.findUnique({ where: { id: rawFacilityId }, select: { id: true } })
    : null;
  if (!facility) return { error: "Pick who's collecting it." };

  const eligible = await db.cleanLog.findMany({
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

  // No cost or receipt photo any more -- see the comment on
  // LaundryLoad.cost in schema.prisma.
  await db.laundryLoad.create({
    data: {
      organizationId: session.user.organizationId,
      facilityId: facility.id,
      recordedById: session.user.id,
      logs: { connect: eligible.map((l) => ({ id: l.id })) },
    },
  });

  revalidatePath("/cleaner/laundry");
  revalidatePath("/admin/laundry");
  return {};
}

// Marks a whole day unavailable -- autoAssignCleaner (src/lib/autoAssign.ts)
// then leaves this cleaner out of consideration for anything scheduled that
// day. Staff can still assign them by hand regardless (see the warning in
// CleanForm.tsx); this only changes what auto-assign guesses.
export async function blockDay(formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireCleaner();

  const raw = str(formData, "date");
  const date = raw ? parseIsoDate(raw) : null;
  if (!date) return { error: "Choose a date." };

  const { start, end } = dayBounds(date);
  const existingClean = await db.clean.findFirst({
    where: {
      assignedToId: session.user.id,
      scheduledFor: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });
  if (existingClean) {
    return {
      error: "You already have a clean scheduled that day. Ask an admin to reassign it before blocking the day.",
    };
  }

  try {
    await db.cleanerUnavailability.create({
      data: { organizationId: session.user.organizationId, cleanerId: session.user.id, date: start },
    });
  } catch (err) {
    // Already blocked -- nothing to do.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
  }

  revalidatePath("/cleaner/calendar");
}

export async function unblockDay(id: string) {
  const { session, db } = await requireCleaner();

  // Scoped to the caller so this can't be used to unblock someone else's day.
  await db.cleanerUnavailability.deleteMany({ where: { id, cleanerId: session.user.id } });

  revalidatePath("/cleaner/calendar");
}
