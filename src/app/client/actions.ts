"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/authz";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// A host asking for a turnover at one of their own places. Deliberately
// creates an unscheduled, unassigned Clean: picking the slot and the cleaner
// is an operations decision, so this lands in the admin list as a request to
// action rather than dropping itself into someone's day.
export async function requestClean(propertyId: string, formData: FormData) {
  const { clientId } = await requireClientAccount();
  if (!clientId) throw new Error("This login isn't linked to a portfolio");

  // Ownership is re-checked here, not assumed from the page that rendered the
  // form -- a server action is reachable by direct POST.
  const property = await prisma.property.findFirst({
    where: { id: propertyId, clientId },
    select: { id: true },
  });
  if (!property) throw new Error("Property not found");

  await prisma.clean.create({
    data: {
      propertyId: property.id,
      requestedByClientId: clientId,
      clientNote: str(formData, "clientNote"),
      guestCount: int(formData, "guestCount"),
    },
  });

  revalidatePath("/client/cleans");
  revalidatePath(`/client/properties/${propertyId}`);
  revalidatePath("/admin/cleans");
}
