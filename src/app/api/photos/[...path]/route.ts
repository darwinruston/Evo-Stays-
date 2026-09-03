import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Property photos are client-sensitive: they show the inside of someone's
// home. Only staff read them unconditionally -- a CLIENT is limited to their
// own portfolio, and a CLEANER to properties they're assigned at. Without
// this, guessing a path would walk straight past the scoping the /client and
// /cleaner pages enforce.
//
// This is a deliberate tightening of the sibling app's "any signed-in user
// may read any photo" rule, which was written for a product with no client
// logins and no reason to fence its field staff.
//
// Denials return 404 rather than 403 so the response doesn't confirm that
// some other client's property id exists.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const resolved = path.resolve(STORAGE_ROOT, ...segments);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Photos are stored under {propertyId}/{filename} (see savePropertyPhotos),
  // so the first segment is the property this file belongs to. Turnover
  // before/after shots live under the same root, so this one check covers
  // PropertyImage and CleanPhoto alike.
  const propertyId = segments[0];

  if (session.user.role === "CLIENT") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { clientId: true },
    });
    if (!user?.clientId) return new NextResponse("Not found", { status: 404 });

    const owned = await prisma.property.findFirst({
      where: { id: propertyId, clientId: user.clientId },
      select: { id: true },
    });
    if (!owned) return new NextResponse("Not found", { status: 404 });
  }

  if (session.user.role === "CLEANER") {
    const assigned = await prisma.clean.findFirst({
      where: { propertyId, assignedToId: session.user.id },
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
