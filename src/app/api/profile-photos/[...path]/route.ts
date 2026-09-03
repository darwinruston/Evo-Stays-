import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { PROFILE_PHOTO_STORAGE_ROOT } from "@/lib/profilePhotos";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Any signed-in user may view any profile photo. Unlike property photos
// (see /api/photos, which scopes by client), these are headshots and org
// logos -- not a window into someone's home -- and a client will eventually
// need to see the cleaner assigned to their property.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const resolved = path.resolve(PROFILE_PHOTO_STORAGE_ROOT, ...segments);
  if (!resolved.startsWith(PROFILE_PHOTO_STORAGE_ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const contentType = CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
