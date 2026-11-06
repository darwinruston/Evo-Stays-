import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { EXTENSION_BY_TYPE, isAllowedImageType } from "@/lib/imageTypes";

// Separate storage root (and separate serving route, see
// src/app/api/profile-photos/[...path]/route.ts) from property photos --
// same disk-storage approach, kept apart so the two never risk colliding
// or cross-contaminating path logic.
export const PROFILE_PHOTO_STORAGE_ROOT = path.join(process.cwd(), "storage", "profile-photos");

// One current photo per person/org -- each upload adds a new file and
// repoints photoPath at it. Callers that replace a photo remove the old file
// with deleteProfilePhoto.
//
// The stored extension comes from the type that was checked, never from the
// uploaded file's own name (see src/lib/imageTypes.ts).
export async function saveProfilePhoto(ownerId: string, file: File): Promise<string> {
  if (file.size === 0) throw new Error("No file provided");
  if (!isAllowedImageType(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Photos only.`);
  }

  const dir = path.join(PROFILE_PHOTO_STORAGE_ROOT, ownerId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${EXTENSION_BY_TYPE[file.type]}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `${ownerId}/${filename}`;
}

// Removes a stored photo. Already gone is fine.
export async function deleteProfilePhoto(relativePath: string): Promise<void> {
  const resolved = path.resolve(PROFILE_PHOTO_STORAGE_ROOT, relativePath);
  if (!resolved.startsWith(PROFILE_PHOTO_STORAGE_ROOT + path.sep)) return;
  await unlink(resolved).catch(() => undefined);
}
