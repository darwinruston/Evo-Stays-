"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { formatCurrency } from "@/lib/invoices";
import { logAudit } from "@/lib/audit";
import { dayBounds, parseIsoDate } from "@/lib/schedule";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createCleaner(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!name || !email || !password) throw new Error("Name, email and password are all required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("That email address already has a login");

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CLEANER",
    },
  });

  revalidatePath("/admin/cleaners");
  redirect("/admin/cleaners");
}

function rate(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Only affects invoices generated after this is saved -- past ones keep
// whatever rate was snapshotted onto them at the time (see
// Invoice.hourlyRate / src/lib/invoices.ts).
export async function updateCleanerRate(id: string, formData: FormData) {
  const session = await requireStaff();

  const hourlyRate = rate(formData, "hourlyRate");
  await prisma.user.update({
    where: { id, role: "CLEANER" },
    data: { hourlyRate },
  });

  await logAudit({
    actorId: session.user.id,
    entityType: "Cleaner",
    entityId: id,
    summary: hourlyRate !== null ? `Hourly rate set to ${formatCurrency(hourlyRate)}` : "Hourly rate cleared",
  });

  revalidatePath(`/admin/cleaners/${id}`);
}

// How far ahead "My cleans" shows this cleaner's upcoming work -- see the
// scheduleHorizonDays comment on User in schema.prisma. Not audited, unlike
// most of what's on this page: it's a display preference, not something
// worth being able to answer for later the way a pay rate or reassignment
// is.
export async function updateCleanerScheduleHorizon(id: string, formData: FormData) {
  await requireStaff();

  await prisma.user.update({
    where: { id, role: "CLEANER" },
    data: { scheduleHorizonDays: int(formData, "scheduleHorizonDays") },
  });

  revalidatePath(`/admin/cleaners/${id}`);
}

// Designates this cleaner as a regular/preferred worker for a property --
// autoAssignCleaner (src/lib/autoAssign.ts) only ever picks from a
// property's designated cleaners, never anyone else. A strong preference
// among them, not exclusivity: someone else designated on the same property
// can still be picked instead (by load/familiarity), or assigned by hand
// regardless. A property with no designation at all is left Unassigned for
// an admin to direct, rather than auto-assign guessing at random.
export async function assignCleanerProperty(cleanerId: string, formData: FormData) {
  await requireStaff();

  const propertyId = str(formData, "propertyId");
  if (!propertyId) throw new Error("Choose a property");

  try {
    await prisma.propertyCleaner.create({ data: { cleanerId, propertyId } });
  } catch (err) {
    // Already designated -- nothing to do. Not a rethrow-as-friendly-error
    // like the Hostify listing link elsewhere, since there's no meaningful
    // conflict to explain here (unlike one listing linking to two
    // properties), just a redundant click.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
}

export async function removeCleanerProperty(cleanerId: string, propertyId: string) {
  await requireStaff();

  await prisma.propertyCleaner.deleteMany({ where: { cleanerId, propertyId } });

  revalidatePath(`/admin/cleaners/${cleanerId}`);
}

// Moves every not-yet-started clean this cleaner has to someone else in one
// go -- for when they're off sick, on leave, or leaving, rather than
// reassigning each clean by hand one at a time. Only PENDING cleans move:
// anything already in progress or completed reflects real work already
// underway or done, same guard icalSync/hostifySync already use before ever
// touching a clean's date or assignee.
export async function reassignUpcomingCleans(cleanerId: string, formData: FormData) {
  const session = await requireStaff();

  const targetCleanerId = str(formData, "targetCleanerId");
  if (!targetCleanerId) throw new Error("Choose who to reassign to");
  if (targetCleanerId === cleanerId) throw new Error("Choose a different cleaner to reassign to");

  const fromRaw = str(formData, "fromDate");
  const toRaw = str(formData, "toDate");
  const fromDate = fromRaw ? parseIsoDate(fromRaw) : null;
  const toDate = toRaw ? parseIsoDate(toRaw) : null;

  const [source, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: cleanerId }, select: { name: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: targetCleanerId, role: "CLEANER" }, select: { name: true } }),
  ]);

  const affected = await prisma.clean.findMany({
    where: {
      assignedToId: cleanerId,
      status: "PENDING",
      ...(fromDate || toDate
        ? {
            scheduledFor: {
              ...(fromDate ? { gte: fromDate } : {}),
              // Inclusive of the whole "to" day -- its exclusive upper
              // bound is the start of the following day.
              ...(toDate ? { lt: dayBounds(toDate).end } : {}),
            },
          }
        : {}),
    },
    select: { id: true },
  });
  if (affected.length === 0) {
    throw new Error("No upcoming cleans to reassign in that range");
  }

  const ids = affected.map((c) => c.id);
  await prisma.clean.updateMany({ where: { id: { in: ids } }, data: { assignedToId: targetCleanerId } });

  for (const cleanId of ids) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Clean",
      entityId: cleanId,
      summary: `Reassigned from ${source.name} to ${target.name} (bulk reassignment)`,
    });
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
  revalidatePath(`/admin/cleaners/${targetCleanerId}`);
  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
}

// Moves a property's existing upcoming cleans to a cleaner just designated
// on it -- designating someone (assignCleanerProperty above) only ever
// affects new cleans going forward; it never touches work already on the
// books, which otherwise stays wherever it was before the designation
// existed. Same PENDING-only, optional-date-range shape as
// reassignUpcomingCleans, just keyed by property instead of by source
// cleaner. Deliberately `OR [null, not: cleanerId]` rather than just
// `not: cleanerId` -- SQL's `<>` is NULL-unsafe (NULL <> x is neither true
// nor false), so a plain `not` silently excludes every Unassigned clean
// instead of picking them up, which is the main case this exists for.
export async function reassignPropertyCleansToCleaner(
  propertyId: string,
  cleanerId: string,
  formData: FormData,
) {
  const session = await requireStaff();

  const [property, cleaner] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { name: true, address: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: cleanerId, role: "CLEANER" }, select: { name: true } }),
  ]);

  const fromRaw = str(formData, "fromDate");
  const toRaw = str(formData, "toDate");
  const fromDate = fromRaw ? parseIsoDate(fromRaw) : null;
  const toDate = toRaw ? parseIsoDate(toRaw) : null;

  const affected = await prisma.clean.findMany({
    where: {
      propertyId,
      status: "PENDING",
      OR: [{ assignedToId: null }, { assignedToId: { not: cleanerId } }],
      ...(fromDate || toDate
        ? {
            scheduledFor: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lt: dayBounds(toDate).end } : {}),
            },
          }
        : {}),
    },
    include: { assignedTo: { select: { name: true } } },
  });
  if (affected.length === 0) {
    throw new Error("No upcoming cleans to move in that range");
  }

  const ids = affected.map((c) => c.id);
  await prisma.clean.updateMany({ where: { id: { in: ids } }, data: { assignedToId: cleanerId } });

  for (const clean of affected) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Clean",
      entityId: clean.id,
      summary: `Reassigned from ${clean.assignedTo?.name ?? "Unassigned"} to ${cleaner.name} (${property.name || property.address} designation)`,
    });
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
}

export async function deleteCleaner(id: string) {
  const session = await requireStaff();

  // Cleans keep pointing at a deleted cleaner would break the assignee
  // relation, so unassign them first -- the work still needs doing, it just
  // needs somebody else. Completed cleans keep their log (CleanLog.recordedBy
  // is a separate, restrictive relation), so history isn't rewritten.
  const cleaner = await prisma.user.findUniqueOrThrow({ where: { id }, select: { name: true } });
  const hasHistory = await prisma.cleanLog.findFirst({
    where: { recordedById: id },
    select: { id: true },
  });
  if (hasHistory) {
    throw new Error(
      "This cleaner has completed cleans on record, so their account can't be deleted without erasing that history.",
    );
  }

  await prisma.clean.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
  await prisma.user.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    entityType: "Cleaner",
    entityId: id,
    summary: `Removed -- ${cleaner.name}`,
  });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin/cleans");
  redirect("/admin/cleaners");
}
