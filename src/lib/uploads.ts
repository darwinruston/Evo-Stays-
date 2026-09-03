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
