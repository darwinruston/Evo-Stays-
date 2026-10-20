"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

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
