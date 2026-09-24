import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { EXTENSION_BY_TYPE, isAllowedImageType } from "@/lib/imageTypes";

// Local disk storage, outside `public` so files are only reachable through
// the authenticated route handler at /api/photos/[...path] -- which is also
// where per-client access is enforced, since one host must never see another
// host's property photos. Fine for local dev; swap for cloud object storage
// before deploying somewhere without a persistent filesystem, same as the
// SQLite -> Postgres swap.
export const STORAGE_ROOT = path.join(process.cwd(), "storage", "property-photos");

// Laundry tickets stopped being photographed once the laundry company
// started collecting/dropping off at the property directly (see the
// comment on LaundryLoad.receiptPath in schema.prisma) -- nothing writes
// here any more. Kept only so /api/laundry-photos/[...path]/route.ts can
// still serve tickets photographed before that change.
export const LAUNDRY_STORAGE_ROOT = path.join(process.cwd(), "storage", "laundry-photos");

// Saves uploaded property images to disk and returns their storage-relative
// paths (as stored on PropertyImage.path). The leading path segment is the
// property id, which is what the serving route checks ownership against.
// See src/lib/imageTypes.ts for the allowed formats, and why the stored
// extension comes from the checked type rather than the filename.
export async function savePropertyPhotos(propertyId: string, files: File[]): Promise<string[]> {
  const images = files.filter((f) => f.size > 0);
  for (const file of images) {
    if (!isAllowedImageType(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || "unknown"}. Photos only.`);
    }
  }

  if (images.length === 0) return [];

  const dir = path.join(STORAGE_ROOT, propertyId);
  await mkdir(dir, { recursive: true });

  const paths: string[] = [];
  for (const file of images) {
    const ext = EXTENSION_BY_TYPE[file.type];
    const filename = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    paths.push(`${propertyId}/${filename}`);
  }
  return paths;
}

// Downloads a property's cover photo straight from Hostify at import time
// (see fetchHostifyCoverPhotoUrl / importHostifyListings), rather than
// staff having to save it from Hostify and re-upload it by hand. A basic
// content-type check guards against silently saving an error page as a
// ".jpg" if the CDN URL ever 404s or redirects somewhere unexpected --
// otherwise the same disk layout as savePropertyPhotos, just fed from a
// fetch() response instead of a browser File.
export async function saveHostifyCoverPhoto(propertyId: string, photoUrl: string): Promise<string> {
  const res = await fetch(photoUrl);
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.startsWith("image/")) {
    throw new Error(`Couldn't download cover photo (${res.status} ${contentType})`);
  }

  const dir = path.join(STORAGE_ROOT, propertyId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(new URL(photoUrl).pathname) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `${propertyId}/${filename}`;
}
