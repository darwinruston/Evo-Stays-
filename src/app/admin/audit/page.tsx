import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { AUDIT_ENTITY_HREF, AUDIT_ENTITY_LABELS, type AuditEntityType } from "@/lib/audit";
import { AuditFilters } from "@/components/AuditFilters";
import { formatScheduledFor } from "@/lib/schedule";
import { card, badge } from "@/lib/ui";

export const metadata = { title: "Activity" };

// Latest 200 rather than real pagination -- nothing else in this app pages
// yet either (see /admin/cleans), and 200 is well past what "what just
// happened" actually needs. Worth building real pagination if this list
// ever becomes the primary way staff dig through history instead.
const RECENT_LIMIT = 200;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string }>;
}) {
  await requireStaff();
  const { entityType } = await searchParams;

  const isValidType = entityType !== undefined && Object.hasOwn(AUDIT_ENTITY_LABELS, entityType);

  const entries = await prisma.auditLog.findMany({
    where: isValidType ? { entityType } : {},
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>

      <AuditFilters />

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {isValidType ? "No activity of this type yet." : "Nothing recorded yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            // The audited row may since have been deleted -- this link isn't
            // checked against that, so it can 404 for an old, since-removed
            // entity. Acceptable for now: the summary text already stands on
            // its own without needing the link to resolve.
            const href = AUDIT_ENTITY_HREF[entry.entityType as AuditEntityType]?.(entry.entityId);
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className={badge()}>{AUDIT_ENTITY_LABELS[entry.entityType as AuditEntityType] ?? entry.entityType}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{formatScheduledFor(entry.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm">{entry.summary}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{entry.actor?.name ?? "Unknown"}</p>
              </>
            );
            return (
              <li key={entry.id} className={card("p-4")}>
                {href ? (
                  <Link href={href} className="block transition-colors hover:opacity-70">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
