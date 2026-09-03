"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PropertyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { savePropertyPhotos } from "@/lib/uploads";

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
