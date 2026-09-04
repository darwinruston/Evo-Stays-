import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LAUNDRY_STORAGE_ROOT } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Mirrors /api/photos/[...path] (see the comment there for the general
// shape) but as a separate route rather than a branch on that one: that
// route's whole authorization model is "the first path segment is a
// property id", which doesn't apply here -- a laundry load can cover
// visits at several different properties.
//
// A CLEANER may only read a load's ticket photo if that load includes at
// least one visit assigned to them; ADMIN/OFFICE read everything. 404 (not
// 403) on denial, same reasoning as the property photos route.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const resolved = path.resolve(LAUNDRY_STORAGE_ROOT, ...segments);
  if (!resolved.startsWith(LAUNDRY_STORAGE_ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Photos are stored under {laundryLoadId}/{filename} (see
  // saveLaundryPhoto), so the first segment is the load this file belongs to.
  const laundryLoadId = segments[0];

  if (session.user.role === "CLEANER") {
    const assigned = await prisma.laundryLoad.findFirst({
      where: { id: laundryLoadId, logs: { some: { clean: { assignedToId: session.user.id } } } },
      select: { id: true },
    });
    if (!assigned) return new NextResponse("Not found", { status: 404 });
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
