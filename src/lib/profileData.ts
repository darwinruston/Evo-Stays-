import { prisma, type ScopedPrismaClient } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/profile";

// What the profile page shows for whoever is signed in: their own name, email
// and role, and their company's name. Read through the signed-in person's own
// company-scoped client, so it can only ever be their own row.
export async function loadProfile(
  db: ScopedPrismaClient,
  session: { user: { id: string; organizationId: string; impersonatedBy?: string } },
) {
  const [user, organisation] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { name: true, email: true, role: true } }),
    // Organisation carries no row-level security (see UNSCOPED_MODELS in
    // src/lib/prisma.ts), so the plain client reads it.
    prisma.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } }),
  ]);
  return {
    name: user.name,
    email: user.email,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    organisationName: organisation?.name ?? null,
    // Support staff viewing a company as its admin can look but not change.
    canChangePassword: !session.user.impersonatedBy,
  };
}
