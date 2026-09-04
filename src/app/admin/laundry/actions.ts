"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { saveLaundryPhoto } from "@/lib/uploads";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function cost(formData: FormData): number {
  const raw = str(formData, "cost");
  const n = raw === null ? NaN : Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid cost.");
  return n;
}

function selectedCleanLogIds(formData: FormData): string[] {
  return formData.getAll("cleanLogIds").filter((v): v is string => typeof v === "string");
}

function photoFile(formData: FormData): File {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Upload a photo of the ticket.");
  return file;
}

// Any completed visit not already claimed by another load -- same
// "real completed visit" filter generateInvoices uses in src/lib/invoices.ts.
const ELIGIBLE_LOG_WHERE = {
  laundryLoadId: null,
  arrivedAt: { not: null },
  departedAt: { not: null },
  clean: { status: "COMPLETED" as const },
};

export async function createLaundryLoad(formData: FormData) {
  const session = await requireStaff();

  const requestedIds = selectedCleanLogIds(formData);
  if (requestedIds.length === 0) throw new Error("Pick at least one clean.");

  // Re-validated server-side: only logs that are actually still eligible get
  // connected, regardless of what the submitted checkboxes claimed -- the
  // same defense-in-depth every other action in this app applies.
  const eligible = await prisma.cleanLog.findMany({
    where: { id: { in: requestedIds }, ...ELIGIBLE_LOG_WHERE },
    select: { id: true },
  });
  if (eligible.length === 0) throw new Error("None of the selected visits are eligible.");

  // Generated up front so the photo can be saved under {id}/{filename} and
  // the whole row written in one create() -- see saveLaundryPhoto.
  const laundryLoadId = randomUUID();
  const receiptPath = await saveLaundryPhoto(laundryLoadId, photoFile(formData));

  await prisma.laundryLoad.create({
    data: {
      id: laundryLoadId,
      cost: cost(formData),
      receiptPath,
      recordedById: session.user.id,
      logs: { connect: eligible.map((l) => ({ id: l.id })) },
    },
  });

  revalidatePath("/admin/laundry");
  revalidatePath("/cleaner/laundry");
}

// Row only -- frees the linked logs back to unlinked (onDelete: SetNull on
// CleanLog.laundryLoadId) so they become eligible again; the ticket photo
// file is left on disk, same tradeoff already accepted for property photos.
export async function deleteLaundryLoad(id: string) {
  await requireStaff();
  await prisma.laundryLoad.delete({ where: { id } });
  revalidatePath("/admin/laundry");
  revalidatePath("/cleaner/laundry");
  redirect("/admin/laundry");
}

// Toggle, same shape as setInvoicePaid: collectedAt null means still out at
// the laundrette. This is what makes a property's "currently out" section
// self-closing -- once set, the load just stops matching that section's
// `collectedAt: null` filter instead of needing to be removed by hand.
// propertyId is only for revalidating the property page this was called
// from (a load can cover several properties, so there's no single one to
// derive) -- pass null when there isn't one, e.g. from the load detail page.
export async function setLaundryLoadCollected(id: string, propertyId: string | null, collected: boolean) {
  await requireStaff();

  await prisma.laundryLoad.update({
    where: { id },
    data: { collectedAt: collected ? new Date() : null },
  });

  revalidatePath("/admin/laundry");
  revalidatePath(`/admin/laundry/${id}`);
  if (propertyId) revalidatePath(`/admin/properties/${propertyId}`);
}
