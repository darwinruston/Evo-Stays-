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

// Rate fields are optional and can be fractional (e.g. 0.5 rolls per guest
// per night), unlike the plain-count int() helpers used elsewhere.
function rate(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createStockItem(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.stockItem.create({
    data: { name, unit: str(formData, "unit"), usagePerGuestNight: rate(formData, "usagePerGuestNight") },
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}

export async function updateStockItem(id: string, formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.stockItem.update({
    where: { id },
    data: {
      name,
      unit: str(formData, "unit"),
      usagePerGuestNight: rate(formData, "usagePerGuestNight"),
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}

export async function deleteStockItem(id: string) {
  await requireStaff();

  // An item with usage history stays as a record of what was actually
  // counted on real visits -- deleting it would rewrite that history out
  // from under every clean it was recorded against. Mark it inactive
  // instead, same as Service in the sibling app.
  const used = await prisma.stockUsageLog.findFirst({ where: { stockItemId: id }, select: { id: true } });
  if (used) {
    throw new Error(
      "This item has recorded usage on past cleans, so it can't be deleted. Mark it inactive instead.",
    );
  }

  // No usage yet, but it may still be configured as a par level somewhere --
  // that's fine to remove along with it, nothing to lose.
  await prisma.$transaction([
    prisma.propertyStockLevel.deleteMany({ where: { stockItemId: id } }),
    prisma.stockItem.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}
