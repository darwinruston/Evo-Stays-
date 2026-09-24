import { prisma } from "@/lib/prisma";

// Kept to the entities this app actually tracks history for -- see the
// AuditLog model comment in schema.prisma for what's deliberately excluded.
export type AuditEntityType = "Clean" | "Property" | "Client" | "Cleaner" | "Invoice" | "Issue";

// Where an audit row's entity still lives, for linking back to it from the
// activity list. The entity may since have been deleted -- callers don't
// check, so a link can 404; see the note on AuditLogPage.
export const AUDIT_ENTITY_HREF: Record<AuditEntityType, (id: string) => string> = {
  Clean: (id) => `/admin/cleans/${id}`,
  Property: (id) => `/admin/properties/${id}`,
  Client: (id) => `/admin/clients/${id}`,
  Cleaner: (id) => `/admin/cleaners/${id}`,
  Invoice: (id) => `/admin/invoices/${id}`,
  Issue: (id) => `/admin/issues/${id}`,
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  Clean: "Clean",
  Property: "Property",
  Client: "Client",
  Cleaner: "Cleaner",
  Invoice: "Invoice",
  Issue: "Issue",
};

// actorId is nullable to match the schema -- an automated change (Hostify
// or calendar sync) still has a real actor, the "Automated sync" system
// user (see src/lib/systemUser.ts), so this is really only null for a
// hypothetical caller with no session at all.
export async function logAudit(input: {
  actorId: string | null;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
}): Promise<void> {
  await prisma.auditLog.create({ data: input });
}
