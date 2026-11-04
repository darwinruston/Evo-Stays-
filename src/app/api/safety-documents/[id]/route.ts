import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { isStaffSession } from "@/lib/authz";
import { scopedDb } from "@/lib/prisma";
import { opensInBrowser } from "@/lib/documentTypes";
import { SAFETY_DOCUMENTS_ROOT } from "@/lib/safetyDocuments";

// Serves one health and safety document. Certificates and reports are for
// the people who run the properties, so only signed-in Admin and Office staff
// get them, and only from their own company: the lookup goes through the
// company-scoped client, so another company's document id finds nothing.
// Cleaners and linen logins are refused. Anything refused returns 404, so the
// response doesn't confirm that a document exists.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isStaffSession())) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  const db = scopedDb(session.user.organizationId);
  const doc = await db.safetyDocument.findUnique({
    where: { id },
    select: { path: true, fileName: true, contentType: true },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const resolved = path.resolve(SAFETY_DOCUMENTS_ROOT, doc.path);
  if (!resolved.startsWith(SAFETY_DOCUMENTS_ROOT + path.sep)) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await readFile(resolved);
    const disposition = opensInBrowser(doc.contentType) ? "inline" : "attachment";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
