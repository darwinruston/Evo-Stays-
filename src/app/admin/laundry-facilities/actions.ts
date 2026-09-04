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
