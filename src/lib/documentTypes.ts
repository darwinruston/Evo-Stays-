// The file types a health and safety document can be, each with the extension
// it is saved under. Free of any Node imports (unlike src/lib/safetyDocuments.ts,
// which writes the files) so the upload form can use ACCEPTED_DOCUMENT_TYPES.
//
// As with photos (src/lib/imageTypes.ts), the stored extension comes from the
// type that was checked, never from the uploaded file's own name. Nothing that
// can run in a browser (HTML, SVG, scripts) is on the list.
export const EXTENSION_BY_DOCUMENT_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export function isAllowedDocumentType(type: string): boolean {
  return Object.hasOwn(EXTENSION_BY_DOCUMENT_TYPE, type);
}

// For an <input accept> attribute.
export const ACCEPTED_DOCUMENT_TYPES = Object.keys(EXTENSION_BY_DOCUMENT_TYPE).join(",");

// One file; the server also accepts at most 15 MB in one request.
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MAX_FILES = 5;

// "1.4 MB", "230 KB".
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Opened in the browser tab rather than downloaded: PDFs and photos. Word
// files can't be shown there, so they download.
export function opensInBrowser(contentType: string): boolean {
  return contentType === "application/pdf" || contentType.startsWith("image/");
}

// "PDF", "Photo" or "Word file", for the line under a kept document.
export function documentKind(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.startsWith("image/")) return "Photo";
  return "Word file";
}
