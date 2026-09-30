"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
// prisma (the raw client) is used once below, deliberately -- see the
// comment on deleteStockItem.

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Unit is a free label for what's being counted -- "roll", "bottle" -- shown
// next to a number, never used in arithmetic. A bare number here (someone
// typing a quantity into the wrong field, e.g. "3") would display as
// nonsense like "3 3", so it's rejected the same way a required field is.
function unit(formData: FormData, key: string): string | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Unit should describe what’s being counted (e.g. "roll", "bottle"), not a number.');
  }
  return raw;
}

export async function createStockItem(formData: FormData) {
  const { session, db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.stockItem.create({
    data: { organizationId: session.user.organizationId, name, unit: unit(formData, "unit") },
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}

export async function updateStockItem(id: string, formData: FormData) {
  const { db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.stockItem.update({
    where: { id },
    data: {
      name,
      unit: unit(formData, "unit"),
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}

export async function deleteStockItem(id: string) {
  const { session, db } = await requireStaff();

  // An item with usage history stays as a record of what was actually
  // counted on real visits -- deleting it would rewrite that history out
  // from under every clean it was recorded against. Mark it inactive
  // instead, same as Service in the sibling app.
  const used = await db.stockUsageLog.findFirst({ where: { stockItemId: id }, select: { id: true } });
  if (used) {
    throw new Error(
      "This item has recorded usage on past cleans, so it can't be deleted. Mark it inactive instead.",
    );
  }

  // No usage yet, but it may still be configured as a par level somewhere --
  // that's fine to remove along with it, nothing to lose. Needs the two
  // deletes atomic with each other, which the scoped `db` extension can't
  // provide (see the matching comment in admin/invoices/actions.ts's
  // adjustInvoiceLineHours) -- falls back to the raw client's own
  // $transaction, setting the RLS session variable by hand.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${session.user.organizationId}, TRUE)`;
    await tx.propertyStockLevel.deleteMany({ where: { stockItemId: id } });
    await tx.stockItem.delete({ where: { id } });
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}
