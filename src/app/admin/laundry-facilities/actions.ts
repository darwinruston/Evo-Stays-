"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createLaundryFacility(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.laundryFacility.create({ data: { name } });

  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}

// Called directly from the laundry-load wizard (src/components/LaundryLoadWizard.tsx)
// when the launderette someone wants isn't in the list yet -- creates it and
// hands back {id, name} to select immediately, no redirect and no leaving
// the wizard (which would lose the visits already picked on an earlier
// step). A name that already exists is reused rather than erroring --
// reactivating it first if it had been deactivated -- since the point is
// "make sure this exists and is usable", not strict duplicate-prevention.
export async function createLaundryFacilityQuick(name: string): Promise<{ id: string; name: string }> {
  await requireStaff();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a name for the launderette.");

  const existing = await prisma.laundryFacility.findUnique({ where: { name: trimmed } });
  const facility = existing
    ? existing.active
      ? existing
      : await prisma.laundryFacility.update({ where: { id: existing.id }, data: { active: true } })
    : await prisma.laundryFacility.create({ data: { name: trimmed } });

  revalidatePath("/admin/laundry-facilities");
  revalidatePath("/admin/laundry");
  revalidatePath("/cleaner/laundry");

  return { id: facility.id, name: facility.name };
}

export async function updateLaundryFacility(id: string, formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.laundryFacility.update({
    where: { id },
    data: { name, active: formData.get("active") === "on" },
  });

  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}

export async function deleteLaundryFacility(id: string) {
  await requireStaff();

  // A facility with loads against it stays as the record of where that
  // linen actually went -- deleting it would rewrite that history out from
  // under every load logged against it. Mark it inactive instead.
  const used = await prisma.laundryLoad.findFirst({ where: { facilityId: id }, select: { id: true } });
  if (used) {
    throw new Error(
      "This facility has laundry loads logged against it, so it can't be deleted. Mark it inactive instead.",
    );
  }

  await prisma.laundryFacility.delete({ where: { id } });

  revalidatePath("/admin/laundry-facilities");
  redirect("/admin/laundry-facilities");
}
