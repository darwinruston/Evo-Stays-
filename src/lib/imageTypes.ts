// The photo formats this app stores, each with the extension it's saved
// under. Kept free of any Node imports (unlike src/lib/uploads.ts, which
// writes the files) so client components can use ACCEPTED_IMAGE_TYPES too.
//
// The stored extension comes from here -- the type that was actually
// checked -- never from the uploaded file's own name, which the client
// controls: a file sent as image/png but named "x.html" is still saved as
// ".png".
export const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export function isAllowedImageType(type: string): boolean {
  return Object.hasOwn(EXTENSION_BY_TYPE, type);
}

// For an <input accept> attribute, so the file picker offers only what the
// server will take -- "image/*" would let someone pick a GIF or SVG and
// only find out it's rejected after submitting.
export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSION_BY_TYPE).join(",");
