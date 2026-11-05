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
