"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { isCountryCode, isCurrencyCode } from "@/lib/region";

// Switching a part off only hides it and refuses new work in it: nothing
// already recorded is deleted, so turning it back on brings it all back.
export async function updateModules(formData: FormData) {
  const { session } = await requireAdmin();

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      syncEnabled: formData.get("sync") === "on",
      invoicingEnabled: formData.get("invoicing") === "on",
      laundryEnabled: formData.get("laundry") === "on",
      stockEnabled: formData.get("stock") === "on",
    },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
}

// The country the company works in decides how dates, money and the clock are
// written (see src/lib/region.ts). Changing the currency only changes how
// amounts are written: no recorded amount is converted.
export async function updateRegion(formData: FormData) {
  const { session } = await requireAdmin();

  const country = formData.get("country");
  const currency = formData.get("currency");
  if (!isCountryCode(country) || !isCurrencyCode(currency)) return;

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { country, currency },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
  revalidatePath("/linen", "layout");
}
