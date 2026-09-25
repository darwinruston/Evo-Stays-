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
import { notify, cleanAssignedNotice, cleanUnassignedNotice } from "@/lib/notify";

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

// Name, email, and (optionally) password -- the details set once at
// creation but otherwise had no edit path at all. Password is the same
// "blank means leave it alone" convention as Client.hostifyApiKey: a
// secret field defaults to no change rather than clearing it, and it's
// never read back into the form to prefill (a decrypted secret showing up
// in page source is bad practice regardless of how it got there).
export async function updateCleaner(id: string, formData: FormData) {
  const session = await requireStaff();

  const name = str(formData, "name");
  const email = str(formData, "email");
  if (!name || !email) throw new Error("Name and email are both required");

  const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== id) throw new Error("That email address already has a login");

  const password = str(formData, "password");
  if (password !== null && password.length < 8) throw new Error("Password must be at least 8 characters");

  const before = await prisma.user.findUniqueOrThrow({
    where: { id, role: "CLEANER" },
    select: { name: true, email: true },
  });

  await prisma.user.update({
    where: { id, role: "CLEANER" },
    data: {
      name,
      email,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  if (before.name !== name) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Cleaner",
      entityId: id,
      summary: `Renamed from ${before.name} to ${name}`,
    });
  }
  if (before.email !== email) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Cleaner",
      entityId: id,
      summary: `Email changed from ${before.email} to ${email}`,
    });
  }

  revalidatePath(`/admin/cleaners/${id}`);
  revalidatePath("/admin/cleaners");
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
  const session = await requireStaff();

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

  // Designating only ever affects cleans created from now on, so the ticked
  // box hands over what's already on the books too. Nothing to move is
  // fine here -- the designation itself is what was asked for.
  if (formData.get("moveCleans") === "on") {
    await moveCleansToCleaner(session.user.id, propertyId, cleanerId);
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
    select: { id: true, scheduledFor: true, property: { select: { name: true, address: true } } },
  });
  if (affected.length === 0) {
    throw new Error("No upcoming cleans to reassign in that range");
  }

  const ids = affected.map((c) => c.id);
  await prisma.clean.updateMany({ where: { id: { in: ids } }, data: { assignedToId: targetCleanerId } });

  // One notify call for the whole batch, so each cleaner gets a single
  // email listing every clean that moved rather than one per clean.
  await notify(
    affected.flatMap((clean) => [
      ...cleanUnassignedNotice(cleanerId, clean),
      ...cleanAssignedNotice(targetCleanerId, clean, "reassigned"),
    ]),
  );

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

// Moves a property's existing upcoming cleans to a cleaner designated on it
// -- designating someone only ever affects new cleans going forward, so
// whatever is already on the books stays wherever it was unless this runs.
// Shared by "Move cleans here" (a date range, or all of them) and by
// designating with the "also move its upcoming cleans" box ticked. Only
// PENDING cleans move, and only ones not already theirs -- `OR [null, not:
// id]` because a plain `not` would silently skip Unassigned cleans under
// SQL's NULL semantics (SQL's `<>` is NULL-unsafe). Returns how many moved.
async function moveCleansToCleaner(
  actorId: string,
  propertyId: string,
  cleanerId: string,
  range: { fromDate: Date | null; toDate: Date | null } = { fromDate: null, toDate: null },
): Promise<number> {
  const [property, cleaner] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { name: true, address: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: cleanerId, role: "CLEANER" }, select: { name: true } }),
  ]);
  const { fromDate, toDate } = range;

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
    include: {
      assignedTo: { select: { name: true } },
      property: { select: { name: true, address: true } },
    },
  });
  if (affected.length === 0) return 0;

  const ids = affected.map((c) => c.id);
  await prisma.clean.updateMany({ where: { id: { in: ids } }, data: { assignedToId: cleanerId } });

  await notify(
    affected.flatMap((clean) => [
      ...(clean.assignedToId ? cleanUnassignedNotice(clean.assignedToId, clean) : []),
      ...cleanAssignedNotice(cleanerId, clean, "reassigned"),
    ]),
  );

  for (const clean of affected) {
    await logAudit({
      actorId,
      entityType: "Clean",
      entityId: clean.id,
      summary: `Reassigned from ${clean.assignedTo?.name ?? "Unassigned"} to ${cleaner.name} (${property.name || property.address} designation)`,
    });
  }

  revalidatePath(`/admin/cleaners/${cleanerId}`);
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/cleans");
  revalidatePath("/cleaner");
  return affected.length;
}

export async function reassignPropertyCleansToCleaner(
  propertyId: string,
  cleanerId: string,
  formData: FormData,
) {
  const session = await requireStaff();

  const fromRaw = str(formData, "fromDate");
  const toRaw = str(formData, "toDate");
  const moved = await moveCleansToCleaner(session.user.id, propertyId, cleanerId, {
    fromDate: fromRaw ? parseIsoDate(fromRaw) : null,
    toDate: toRaw ? parseIsoDate(toRaw) : null,
  });
  if (moved === 0) throw new Error("No upcoming cleans to move in that range");
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
    summary: `Removed — ${cleaner.name}`,
  });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin/cleans");
  redirect("/admin/cleaners");
}
