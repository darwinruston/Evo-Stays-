"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PropertyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { savePropertyPhotos } from "@/lib/uploads";
import { bandToOnHandQty, type StockLevelBand } from "@/lib/stock";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Counts (bedrooms, sleeps) are optional; anything non-numeric or negative
// is stored as NULL rather than silently becoming 0.
function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function hours(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function accessOptions(formData: FormData): string[] {
  return formData.getAll("accessOptions").filter((v): v is string => typeof v === "string");
}

// Validated against the enum rather than cast, so a hand-crafted POST can't
// put an arbitrary string in the column.
function propertyType(formData: FormData): PropertyType {
  const raw = str(formData, "type");
  const values = Object.values(PropertyType) as string[];
  return raw !== null && values.includes(raw) ? (raw as PropertyType) : PropertyType.APARTMENT;
}

function photoFiles(formData: FormData): File[] {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}

// Keeps exactly one primary image per property: used after uploads and
// deletions so a property with photos always has a cover shot.
async function ensurePrimary(propertyId: string) {
  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, isPrimary: true },
  });
  if (images.length === 0) return;
  if (images.some((i) => i.isPrimary)) return;
  await prisma.propertyImage.update({
    where: { id: images[0].id },
    data: { isPrimary: true },
  });
}

export async function createProperty(formData: FormData) {
  await requireStaff();

  const clientId = str(formData, "clientId");
  const address = str(formData, "address");
  if (!clientId) throw new Error("Client is required");
  if (!address) throw new Error("Address is required");

  const property = await prisma.property.create({
    data: {
      clientId,
      address,
      name: str(formData, "name"),
      type: propertyType(formData),
      bedrooms: int(formData, "bedrooms"),
      bathrooms: int(formData, "bathrooms"),
      maxOccupancy: int(formData, "maxOccupancy"),
      accessOptions: accessOptions(formData),
      accessNotes: str(formData, "accessNotes"),
      notes: str(formData, "notes"),
    },
  });

  const files = photoFiles(formData);
  if (files.length > 0) {
    const paths = await savePropertyPhotos(property.id, files);
    await prisma.propertyImage.createMany({
      data: paths.map((path) => ({ propertyId: property.id, path })),
    });
    await ensurePrimary(property.id);
  }

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/properties/${property.id}`);
}

export async function updateProperty(id: string, formData: FormData) {
  await requireStaff();

  const address = str(formData, "address");
  if (!address) throw new Error("Address is required");

  const property = await prisma.property.update({
    where: { id },
    data: {
      address,
      name: str(formData, "name"),
      type: propertyType(formData),
      bedrooms: int(formData, "bedrooms"),
      bathrooms: int(formData, "bathrooms"),
      maxOccupancy: int(formData, "maxOccupancy"),
      accessOptions: accessOptions(formData),
      accessNotes: str(formData, "accessNotes"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  revalidatePath(`/admin/clients/${property.clientId}`);
  redirect(`/admin/properties/${id}`);
}

export async function deleteProperty(id: string) {
  await requireStaff();

  const property = await prisma.property.delete({ where: { id } });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/clients/${property.clientId}`);
  redirect("/admin/properties");
}

export async function addPropertyPhotos(id: string, formData: FormData) {
  await requireStaff();

  const files = photoFiles(formData);
  if (files.length === 0) return;

  const paths = await savePropertyPhotos(id, files);
  await prisma.propertyImage.createMany({
    data: paths.map((path) => ({ propertyId: id, path })),
  });
  await ensurePrimary(id);

  revalidatePath(`/admin/properties/${id}`);
}

export async function setPrimaryPhoto(propertyId: string, imageId: string) {
  await requireStaff();

  // Scoped to the property so a stray image id can't repoint another
  // property's cover shot.
  const image = await prisma.propertyImage.findFirst({
    where: { id: imageId, propertyId },
    select: { id: true },
  });
  if (!image) throw new Error("Photo not found for this property");

  await prisma.$transaction([
    prisma.propertyImage.updateMany({ where: { propertyId }, data: { isPrimary: false } }),
    prisma.propertyImage.update({ where: { id: image.id }, data: { isPrimary: true } }),
  ]);

  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function deletePropertyPhoto(propertyId: string, imageId: string) {
  await requireStaff();

  const image = await prisma.propertyImage.findFirst({
    where: { id: imageId, propertyId },
    select: { id: true },
  });
  if (!image) throw new Error("Photo not found for this property");

  // Row only -- the file is left on disk, the same tradeoff the sibling app
  // accepts for local dev storage.
  await prisma.propertyImage.delete({ where: { id: image.id } });
  await ensurePrimary(propertyId);

  revalidatePath(`/admin/properties/${propertyId}`);
}

// Configures a par level for one item on this property. onHandQty defaults
// to parQty -- setting one up is a signal the property is being freshly
// stocked to that level, not a signal that it's currently empty. The real
// count then updates as cleans happen.
export async function addPropertyStockLevel(propertyId: string, formData: FormData) {
  await requireStaff();

  const stockItemId = str(formData, "stockItemId");
  const parQty = int(formData, "parQty");
  if (!stockItemId) throw new Error("Pick an item");
  if (parQty === null || parQty < 1) throw new Error("Par level must be at least 1");

  const existing = await prisma.propertyStockLevel.findUnique({
    where: { propertyId_stockItemId: { propertyId, stockItemId } },
  });
  if (existing) throw new Error("That item is already configured on this property");

  await prisma.propertyStockLevel.create({
    data: { propertyId, stockItemId, parQty, onHandQty: parQty },
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/stock");
}

// Corrects par -- the full/restocked amount, a business fact staff actually
// know (a pack or order size), unlike on-hand which nobody counts exactly.
// Separate from the level toggle below on purpose: this changes rarely
// (only when the order size itself changes) and stays a typed number,
// where on-hand changes often and is always an eyeballed level.
export async function updatePropertyStockPar(propertyId: string, levelId: string, formData: FormData) {
  await requireStaff();

  const parQty = int(formData, "parQty");
  if (parQty === null || parQty < 1) throw new Error("Par level must be at least 1");

  // Scoped to the property so a stray level id can't touch another
  // property's stock.
  const level = await prisma.propertyStockLevel.findFirst({
    where: { id: levelId, propertyId },
    select: { id: true },
  });
  if (!level) throw new Error("Stock level not found for this property");

  await prisma.propertyStockLevel.update({ where: { id: level.id }, data: { parQty } });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/stock");
}

// Sets on-hand directly to a tapped level -- for a delivery that arrived
// outside a clean, or noticing something's run low between visits, without
// needing a turnover to happen first. No one actually counts bin bags
// exactly, before or after topping them up, so this asks for the same
// High/Medium/Low/None a cleaner picks rather than a number -- see
// recordStockLevel in src/app/cleaner/actions.ts for the same pattern.
// Unlike that one, this doesn't create a StockUsageLog row: it's a standing
// correction, not something that happened during a specific visit.
export async function setPropertyStockLevel(propertyId: string, levelId: string, formData: FormData) {
  await requireStaff();

  const level = await prisma.propertyStockLevel.findFirst({
    where: { id: levelId, propertyId },
  });
  if (!level) throw new Error("Stock level not found for this property");

  const band = formData.get("band");
  const validBands: StockLevelBand[] = ["high", "medium", "low", "none"];
  if (typeof band !== "string" || !validBands.includes(band as StockLevelBand)) {
    throw new Error("Pick a level.");
  }

  const onHandQty = bandToOnHandQty(band as StockLevelBand, level.parQty);
  await prisma.propertyStockLevel.update({ where: { id: level.id }, data: { onHandQty } });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/stock");
}

// The minimum-hours toggle: an empty field turns it off (invoices bill
// actual check-in/check-out time only), a value turns it on. There's no
// separate checkbox -- the field itself being set or not is the toggle,
// same pattern as par being left blank on the stock item form.
export async function updatePropertyMinBillableHours(propertyId: string, formData: FormData) {
  await requireStaff();

  await prisma.property.update({
    where: { id: propertyId },
    data: { minBillableHours: hours(formData, "minBillableHours") },
  });

  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function removePropertyStockLevel(propertyId: string, levelId: string) {
  await requireStaff();

  const level = await prisma.propertyStockLevel.findFirst({
    where: { id: levelId, propertyId },
    select: { id: true },
  });
  if (!level) throw new Error("Stock level not found for this property");

  // The usage history (StockUsageLog) stays -- it's a record of what was
  // physically counted on real visits, independent of whether the property
  // still tracks that item's par level today.
  await prisma.propertyStockLevel.delete({ where: { id: level.id } });

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/stock");
}
