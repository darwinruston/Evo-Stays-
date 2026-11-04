import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { ScopedPrismaClient } from "@/lib/prisma";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_FILES,
  EXTENSION_BY_DOCUMENT_TYPE,
  isAllowedDocumentType,
} from "@/lib/documentTypes";

// Local disk, outside `public`, in the same persistent `storage` folder as the
// property photos (a volume in the Docker image, so it survives updates). Only
// reachable through /api/safety-documents/[id], which checks who is asking.
export const SAFETY_DOCUMENTS_ROOT = path.join(process.cwd(), "storage", "safety-documents");

// The files actually picked in a form: an empty file input still sends one
// zero-byte entry.
export function pickedFiles(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter((v): v is File => v instanceof File && v.size > 0);
}

// A reason the person can fix, or null if the files are fine. Checked before
// anything is saved, so a bad file never leaves a half-finished save behind.
export function checkDocumentFiles(files: File[]): string | null {
  if (files.length > DOCUMENT_MAX_FILES) return `Add up to ${DOCUMENT_MAX_FILES} files at a time`;
  for (const file of files) {
    if (!isAllowedDocumentType(file.type)) {
      return `${file.name || "That file"} is not a type that can be kept here. Use a PDF, a photo or a Word document.`;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      return `${file.name || "That file"} is over ${Math.round(DOCUMENT_MAX_BYTES / (1024 * 1024))} MB`;
    }
  }
  return null;
}

// The name it was uploaded with, kept for showing and downloading: no folders
// and no control characters, and not unreasonably long.
function cleanFileName(name: string, fallbackExt: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 120);
  return cleaned || `document${fallbackExt}`;
}

// Saves the files to disk and records each against the check. Call
// checkDocumentFiles first. If recording fails the files already written are
// removed again.
export async function saveSafetyDocuments(
  db: ScopedPrismaClient,
  args: {
    organizationId: string;
    checkId: string;
    propertyId: string;
    uploadedById: string;
    completedOn: Date | null;
  },
  files: File[],
): Promise<number> {
  if (files.length === 0) return 0;

  const dir = path.join(SAFETY_DOCUMENTS_ROOT, args.propertyId);
  await mkdir(dir, { recursive: true });

  const written: { relative: string; file: File }[] = [];
  try {
    for (const file of files) {
      const ext = EXTENSION_BY_DOCUMENT_TYPE[file.type];
      const filename = `${randomUUID()}${ext}`;
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
      written.push({ relative: `${args.propertyId}/${filename}`, file });
    }
    await db.safetyDocument.createMany({
      data: written.map(({ relative, file }) => ({
        organizationId: args.organizationId,
        checkId: args.checkId,
        fileName: cleanFileName(file.name, EXTENSION_BY_DOCUMENT_TYPE[file.type]),
        path: relative,
        contentType: file.type,
        sizeBytes: file.size,
        completedOn: args.completedOn,
        uploadedById: args.uploadedById,
      })),
    });
  } catch (error) {
    await deleteSafetyDocumentFiles(written.map((w) => w.relative));
    throw error;
  }
  return written.length;
}

// Removes files from disk. A file that is already gone is not an error.
export async function deleteSafetyDocumentFiles(relativePaths: string[]): Promise<void> {
  for (const relative of relativePaths) {
    const resolved = path.resolve(SAFETY_DOCUMENTS_ROOT, relative);
    if (!resolved.startsWith(SAFETY_DOCUMENTS_ROOT + path.sep)) continue;
    await unlink(resolved).catch(() => undefined);
  }
}
