import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { AUDIT_ENTITY_HREF, AUDIT_ENTITY_LABELS, type AuditEntityType } from "@/lib/audit";
import { AuditFilters } from "@/components/AuditFilters";
import { formatScheduledFor } from "@/lib/schedule";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
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
  searchParams: Promise<{ entityType?: string; actor?: string }>;
}) {
  const { db } = await requireStaff();
  const { entityType, actor } = await searchParams;

  const isValidType = entityType !== undefined && Object.hasOwn(AUDIT_ENTITY_LABELS, entityType);

  // Everyone who has made a change, for the "by person" filter. Only people
  // who appear in the log are offered, so the list never has a name that
  // would show nothing.
  const people = await db.user.findMany({
    where: { auditLogs: { some: {} }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const actorId = people.some((p) => p.id === actor) ? actor : undefined;

  const entries = await db.auditLog.findMany({
    where: { ...(isValidType ? { entityType } : {}), ...(actorId ? { actorId } : {}) },
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>

      <AuditFilters people={people} />

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {isValidType || actorId ? "No matching activity yet." : "Nothing recorded yet."}
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
                <p className="mt-0.5 text-xs text-zinc-500">{entry.actor?.name ?? "Automatic"}</p>
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
