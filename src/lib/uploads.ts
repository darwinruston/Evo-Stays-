import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Local disk storage, outside `public` so files are only reachable through
// the authenticated route handler at /api/photos/[...path] -- which is also
// where per-client access is enforced, since one host must never see another
// host's property photos. Fine for local dev; swap for cloud object storage
// before deploying somewhere without a persistent filesystem, same as the
// SQLite -> Postgres swap.
export const STORAGE_ROOT = path.join(process.cwd(), "storage", "property-photos");

// Laundry ticket photos live under their own root, not property-photos --
// a load isn't scoped to one property (see LaundryLoad in schema.prisma),
// so the access-control route for these needs a different check than "is
// this cleaner assigned at this property". See
// src/app/api/laundry-photos/[...path]/route.ts.
export const LAUNDRY_STORAGE_ROOT = path.join(process.cwd(), "storage", "laundry-photos");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

// Saves uploaded property images to disk and returns their storage-relative
// paths (as stored on PropertyImage.path). The leading path segment is the
// property id, which is what the serving route checks ownership against.
export async function savePropertyPhotos(propertyId: string, files: File[]): Promise<string[]> {
  const images = files.filter((f) => f.size > 0);
  for (const file of images) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || "unknown"}. Photos only.`);
    }
  }

  if (images.length === 0) return [];

  const dir = path.join(STORAGE_ROOT, propertyId);
  await mkdir(dir, { recursive: true });

  const paths: string[] = [];
  for (const file of images) {
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    paths.push(`${propertyId}/${filename}`);
  }
  return paths;
}

// Saves one laundry ticket photo under a caller-supplied load id (generated
// up front by the caller with randomUUID(), before the LaundryLoad row
// exists -- see createLaundryLoad in the admin/cleaner actions -- so the
// whole row, including this path, can be written in a single prisma.create
// rather than a create-then-update). Single photo, not an array: one
// ticket per load is what was asked for.
export async function saveLaundryPhoto(laundryLoadId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Photos only.`);
  }

  const dir = path.join(LAUNDRY_STORAGE_ROOT, laundryLoadId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `${laundryLoadId}/${filename}`;
}
