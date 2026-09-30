import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { ScopedPrismaClient } from "@/lib/prisma";

// The actor attributed as Clean.createdById when a sync runs unattended (the
// scheduler, or the /api/sync endpoint) -- there's no logged-in staff member
// to credit the way a manual "Sync now" click credits whoever clicked it.
// One per organization now, not a single global row -- User.id still has to
// be globally unique (it's the primary key across the whole platform), so
// each organization's system user gets its own id built from this prefix
// plus its organizationId, and its own placeholder email (User.email stays
// globally unique too). ADMIN role keeps it out of autoAssignCleaner's
// CLEANER-only pool. Never used to log in -- the password hash is random and
// discarded.
const SYSTEM_USER_ID_PREFIX = "system-sync:";

export function systemSyncUserId(organizationId: string): string {
  return `${SYSTEM_USER_ID_PREFIX}${organizationId}`;
}

// Exported so staffUserIds (src/lib/notify.ts) and the staff list/actions
// (src/app/admin/staff) can leave the system user out -- it's an ADMIN for
// permission purposes, but not a person who reads notifications or logs in.
export function isSystemSyncUserId(id: string): boolean {
  return id.startsWith(SYSTEM_USER_ID_PREFIX);
}

// For query filters that need the prefix itself (Prisma's `startsWith`),
// rather than a per-id boolean check.
export { SYSTEM_USER_ID_PREFIX };

// Lazily upserted rather than seeded: prisma/seed.ts only runs against a
// brand-new database (see docker-entrypoint.sh), so an existing deployment
// upgrading into this feature would never get a seeded row otherwise.
export async function ensureSystemSyncUser(db: ScopedPrismaClient, organizationId: string): Promise<string> {
  const id = systemSyncUserId(organizationId);
  await db.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      organizationId,
      name: "Automated sync",
      email: `automated-sync+${organizationId}@evostays.internal`,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role: "ADMIN",
    },
  });
  return id;
}
