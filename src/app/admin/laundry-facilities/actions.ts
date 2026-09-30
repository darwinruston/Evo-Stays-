"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/authz";

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

export async function updateLaundryFacility(id: string, formData: FormData) {
  const { db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.laundryFacility.update({
    where: { id },
    data: { name, active: formData.get("active") === "on" },
  });

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
