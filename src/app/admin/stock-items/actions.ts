"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { assertModule } from "@/lib/modules";
import type { ActionResult } from "@/lib/actionResult";
import { DEFAULT_STOCK_AREAS, MAX_STOCK_AREA_NAME } from "@/lib/stockAreas";
import type { ScopedPrismaClient } from "@/lib/prisma";
// prisma (the raw client) is used once below, deliberately -- see the
// comment on deleteStockItem.

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// The area picked on an item's form, or null for none. Checked to be one of
// this company's own, so a crafted form can't point at someone else's.
async function readAreaId(db: ScopedPrismaClient, formData: FormData): Promise<string | null> {
  const areaId = str(formData, "areaId");
  if (!areaId) return null;
  const area = await db.stockArea.findUnique({ where: { id: areaId }, select: { id: true } });
  if (!area) throw new Error("That area no longer exists");
  return area.id;
}

export async function createStockItem(formData: FormData) {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "stock");

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  const areaId = await readAreaId(db, formData);

  await db.stockItem.create({
    data: { organizationId: session.user.organizationId, name, areaId },
  });

  revalidatePath("/admin/stock-items");
  redirect("/admin/stock-items");
}

export async function updateStockItem(id: string, formData: FormData) {
  const { db } = await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  const areaId = await readAreaId(db, formData);

  await db.stockItem.update({
    where: { id },
    data: {
      name,
      areaId,
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

// ---------------------------------------------------------------------------
// Areas: the places stock is kept, in the order a cleaner walks through them.
// These return a reason the person can fix (see ActionResult) rather than
// throwing, because they are driven from a small form on the catalogue page.
// ---------------------------------------------------------------------------

function refreshStock() {
  revalidatePath("/admin/stock-items");
  revalidatePath("/admin/stock");
  revalidatePath("/admin/properties", "layout");
  revalidatePath("/cleaner", "layout");
}

function readAreaName(formData: FormData): { name: string } | { error: string } {
  const name = str(formData, "name");
  if (!name) return { error: "Give the area a name" };
  if (name.length > MAX_STOCK_AREA_NAME) return { error: `Keep the name under ${MAX_STOCK_AREA_NAME} characters` };
  return { name };
}

export async function createStockArea(formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "stock");

  const read = readAreaName(formData);
  if ("error" in read) return read;
  if (await db.stockArea.findFirst({ where: { name: { equals: read.name, mode: "insensitive" } }, select: { id: true } })) {
    return { error: "You already have an area with that name" };
  }

  const last = await db.stockArea.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await db.stockArea.create({
    data: { organizationId: session.user.organizationId, name: read.name, position: (last?.position ?? -1) + 1 },
  });

  refreshStock();
}

export async function renameStockArea(id: string, formData: FormData): Promise<ActionResult> {
  const { db } = await requireStaff();

  const read = readAreaName(formData);
  if ("error" in read) return read;
  const clash = await db.stockArea.findFirst({
    where: { name: { equals: read.name, mode: "insensitive" }, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "You already have an area with that name" };

  await db.stockArea.update({ where: { id }, data: { name: read.name } });

  refreshStock();
}

// One place earlier or later in the walk. Positions are rewritten 0, 1, 2...
// so a gap left by a deleted area can't make a move do nothing.
export async function moveStockArea(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { db } = await requireStaff();

  const areas = await db.stockArea.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = areas.findIndex((a) => a.id === id);
  if (index === -1) return { error: "That area no longer exists" };
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= areas.length) return;

  const order = areas.map((a) => a.id);
  [order[index], order[target]] = [order[target], order[index]];
  for (const [position, areaId] of order.entries()) {
    await db.stockArea.update({ where: { id: areaId }, data: { position } });
  }

  refreshStock();
}

// Its items are kept, just without an area until they are given another.
export async function deleteStockArea(id: string): Promise<ActionResult> {
  const { db } = await requireStaff();

  await db.stockArea.deleteMany({ where: { id } });

  refreshStock();
}

// "Add the usual areas": the ones most properties need, skipping any that
// already exist, added after whatever is there.
export async function addUsualStockAreas(): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "stock");

  const existing = await db.stockArea.findMany({ select: { name: true, position: true } });
  const have = new Set(existing.map((a) => a.name.toLowerCase()));
  let position = existing.reduce((max, a) => Math.max(max, a.position), -1) + 1;
  const missing = DEFAULT_STOCK_AREAS.filter((name) => !have.has(name.toLowerCase()));
  if (missing.length > 0) {
    await db.stockArea.createMany({
      data: missing.map((name) => ({ organizationId: session.user.organizationId, name, position: position++ })),
    });
  }

  refreshStock();
}
