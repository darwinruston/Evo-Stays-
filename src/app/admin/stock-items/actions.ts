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

export async function createStockItem(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await prisma.stockItem.create({
    data: { name, unit: str(formData, "unit") },
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
