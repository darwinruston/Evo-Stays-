import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Separate storage root (and separate serving route, see
// src/app/api/profile-photos/[...path]/route.ts) from property photos --
// same disk-storage approach, kept apart so the two never risk colliding
// or cross-contaminating path logic.
export const PROFILE_PHOTO_STORAGE_ROOT = path.join(process.cwd(), "storage", "profile-photos");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

// One current photo per person/org -- each upload adds a new file and
// repoints photoPath at it (the old file is orphaned on disk; not worth
// cleanup code for local dev storage).
export async function saveProfilePhoto(ownerId: string, file: File): Promise<string> {
  if (file.size === 0) throw new Error("No file provided");
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Photos only.`);
  }

  const dir = path.join(PROFILE_PHOTO_STORAGE_ROOT, ownerId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `${ownerId}/${filename}`;
}
