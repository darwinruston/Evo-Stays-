"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireAdmin, requireStaff } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actionResult";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createLaundryFacility(formData: FormData) {
  const { session, db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.laundryFacility.create({ data: { organizationId: session.user.organizationId, name } });

  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}

// Called directly from the laundry-load wizard (src/components/LaundryLoadWizard.tsx)
// when the laundry company someone wants isn't in the list yet -- creates it and
// hands back {id, name} to select immediately, no redirect and no leaving
// the wizard (which would lose the visits already picked on an earlier
// step). A name that already exists is reused rather than erroring --
// reactivating it first if it had been deactivated -- since the point is
// "make sure this exists and is usable", not strict duplicate-prevention.
export async function createLaundryFacilityQuick(name: string): Promise<{ id: string; name: string }> {
  const { session, db } = await requireStaff();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a name for the laundry company.");

  const existing = await db.laundryFacility.findUnique({
    where: { organizationId_name: { organizationId: session.user.organizationId, name: trimmed } },
  });
  const facility = existing
    ? existing.active
      ? existing
      : await db.laundryFacility.update({ where: { id: existing.id }, data: { active: true } })
    : await db.laundryFacility.create({
        data: { organizationId: session.user.organizationId, name: trimmed },
      });

  revalidatePath("/admin/laundry-facilities");
  revalidatePath("/admin/laundry");
  revalidatePath("/cleaner/laundry");

  return { id: facility.id, name: facility.name };
}

// A whole number of minutes within [min, max], or the fallback when the box
// was left empty or isn't a sensible number.
function minutes(formData: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = str(formData, key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export async function updateLaundryFacility(id: string, formData: FormData) {
  const { db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const before = await db.laundryFacility.findUnique({ where: { id }, select: { depotAddress: true } });
  const depotAddress = str(formData, "depotAddress");

  await db.laundryFacility.update({
    where: { id },
    data: {
      name,
      active: formData.get("active") === "on",
      depotAddress,
      // A new address has to be found on the map again; the old position
      // would put the van in the wrong place.
      ...(depotAddress !== (before?.depotAddress ?? null) ? { depotLatitude: null, depotLongitude: null } : {}),
      handoverPercent: minutes(formData, "handoverPercent", 15, 0, 60),
      minHandoverMinutes: minutes(formData, "minHandoverMinutes", 10, 0, 120),
      cleanLeadPercent: minutes(formData, "cleanLeadPercent", 33, 5, 90),
      minLeadMinutes: minutes(formData, "minLeadMinutes", 15, 0, 240),
      defaultCleanMinutes: minutes(formData, "defaultCleanMinutes", 90, 15, 480),
      stopMinutes: minutes(formData, "stopMinutes", 15, 1, 120),
    },
  });

  revalidatePath("/admin/laundry/schedule");
  revalidatePath("/linen");
  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}

export async function deleteLaundryFacility(id: string) {
  const { db } = await requireStaff();

  // A facility with loads against it stays as the record of where that
  // linen actually went -- deleting it would rewrite that history out from
  // under every load logged against it. Mark it inactive instead.
  const used = await db.laundryLoad.findFirst({ where: { facilityId: id }, select: { id: true } });
  if (used) {
    throw new Error(
      "This facility has laundry loads logged against it, so it can't be deleted. Mark it inactive instead.",
    );
  }

  await db.laundryFacility.delete({ where: { id } });

  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}

// A login for the linen company itself, which only ever sees its own
// delivery schedule (see /linen). Admin-only, like every other login.
export async function createLinenLogin(facilityId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireAdmin();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!name || !email || !password) return { error: "Name, email and password are all required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const facility = await db.laundryFacility.findUnique({ where: { id: facilityId }, select: { id: true } });
  if (!facility) return { error: "That laundry company no longer exists" };

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "That email address already has a login" };

  const created = await db.user.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "LINEN",
      laundryFacilityId: facilityId,
    },
    select: { id: true },
  });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Staff",
    entityId: created.id,
    summary: `Added a linen company login: ${name} (${email})`,
  });

  revalidatePath(`/admin/laundry-facilities/${facilityId}/edit`);
}

export async function removeLinenLogin(userId: string, facilityId: string) {
  const { session, db } = await requireAdmin();

  const user = await db.user.findFirst({
    where: { id: userId, role: "LINEN", laundryFacilityId: facilityId },
    select: { name: true, email: true },
  });
  if (!user) return;

  await db.user.delete({ where: { id: userId } });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Staff",
    entityId: userId,
    summary: `Removed a linen company login: ${user.name} (${user.email})`,
  });

  revalidatePath(`/admin/laundry-facilities/${facilityId}/edit`);
}
