import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// The actor attributed as Clean.createdById when a sync runs unattended (the
// scheduler, or the /api/sync endpoint) -- there's no logged-in staff member
// to credit the way a manual "Sync now" click credits whoever clicked it.
// Fixed id, same "pinned singleton" pattern as BillingSettings.id in
// schema.prisma. ADMIN role keeps it out of autoAssignCleaner's CLEANER-only
// pool. Never used to log in -- the password hash is random and discarded.
const SYSTEM_USER_ID = "system-sync";

// Lazily upserted rather than seeded: prisma/seed.ts only runs against a
// brand-new database (see docker-entrypoint.sh), so an existing deployment
// upgrading into this feature would never get a seeded row otherwise.
export async function ensureSystemSyncUser(): Promise<string> {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},
    create: {
      id: SYSTEM_USER_ID,
      name: "Automated sync",
      email: "automated-sync@evostays.internal",
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role: "ADMIN",
    },
  });
  return SYSTEM_USER_ID;
}
