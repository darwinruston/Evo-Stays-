// Where each kind of login's own profile page is. Staff, cleaners and linen
// companies each have their own area (and top bar), so the page lives inside
// it; they all show the same thing (see src/components/ProfileView.tsx).
export function profilePath(role: string): string {
  if (role === "CLEANER") return "/cleaner/profile";
  if (role === "LINEN") return "/linen/profile";
  return "/admin/profile";
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OFFICE: "Office",
  CLEANER: "Cleaner",
  LINEN: "Linen company",
};

export const PASSWORD_MIN_LENGTH = 8;

// A profile photo is shrunk to a small square in the browser before it is
// sent, so it is always small. Only the formats every browser can show.
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
// The side of that square, in pixels: sharp enough for the profile page and
// the largest avatar, still tiny to send.
export const PROFILE_PHOTO_SIZE = 512;
