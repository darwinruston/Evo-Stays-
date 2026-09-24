import Link from "next/link";
import type { IssueCategory, IssueSeverity, IssueStatus } from "@prisma/client";
import { ISSUE_CATEGORY_LABELS, ISSUE_SEVERITY_LABELS, ISSUE_STATUS_LABELS } from "@/lib/issues";
import { formatDate } from "@/lib/schedule";
import { badge, card } from "@/lib/ui";

export type IssueRow = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  createdAt: Date;
  photoCount: number;
  // What was done about it, once resolved -- so a cleaner looking back at
  // what they reported sees the outcome, not just "Resolved".
  resolutionNote?: string | null;
  // Extra context a caller wants on the meta line -- the property name on
  // the portfolio-wide list, the reporter on a property's own page.
  context?: string | null;
};

// Urgent reads as the one badge that shouts; everything else stays quiet,
// same restraint as the rest of the UI (see BADGE_TONES in src/lib/ui.ts).
function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return <span className={badge(severity === "URGENT" ? "solid" : "outline")}>{ISSUE_SEVERITY_LABELS[severity]}</span>;
}

function IssueRowBody({
  issue,
  showStatus,
  showSeverity,
}: {
  issue: IssueRow;
  showStatus: boolean;
  showSeverity: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{ISSUE_CATEGORY_LABELS[issue.category]}</p>
        {showSeverity && <SeverityBadge severity={issue.severity} />}
        {showStatus && issue.status !== "OPEN" && (
          <span className={badge("neutral")}>{ISSUE_STATUS_LABELS[issue.status]}</span>
        )}
      </div>
      <p className="line-clamp-2 text-sm text-zinc-600 [overflow-wrap:anywhere]">{issue.description}</p>
      {issue.status === "RESOLVED" && issue.resolutionNote && (
        <p className="line-clamp-2 text-sm text-zinc-900 [overflow-wrap:anywhere]">
          <span className="font-medium">Resolved:</span> {issue.resolutionNote}
        </p>
      )}
      <p className="text-xs text-zinc-400">
        {formatDate(issue.createdAt)}
        {issue.context ? ` · ${issue.context}` : ""}
        {issue.photoCount > 0 ? ` · ${issue.photoCount} ${issue.photoCount === 1 ? "photo" : "photos"}` : ""}
      </p>
    </div>
  );
}

// Compact issue cards -- shared by staff's lists (hrefFor given, so each
// row opens the issue) and the cleaner's clean page (no hrefFor: cleaners
// have no issue pages, the summary is the whole story for them).
// showSeverity is off for cleaners: severity is a triage call for staff,
// not something a cleaner needs to weigh.
export function IssueList({
  issues,
  hrefFor,
  showStatus = true,
  showSeverity = true,
}: {
  issues: IssueRow[];
  hrefFor?: (id: string) => string;
  showStatus?: boolean;
  showSeverity?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue) => (
        <li key={issue.id}>
          {hrefFor ? (
            <Link
              href={hrefFor(issue.id)}
              className={card("block p-4 transition-colors hover:bg-black/[0.02]")}
            >
              <IssueRowBody issue={issue} showStatus={showStatus} showSeverity={showSeverity} />
            </Link>
          ) : (
            <div className={card("p-4")}>
              <IssueRowBody issue={issue} showStatus={showStatus} showSeverity={showSeverity} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Maps a Prisma issue row (with a photo count) onto IssueRow -- every
// caller selects the same core fields, then adds its own context string.
export function toIssueRow(
  issue: {
    id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    status: IssueStatus;
    description: string;
    createdAt: Date;
    resolutionNote?: string | null;
    _count: { photos: number };
  },
  context?: string | null,
): IssueRow {
  return {
    id: issue.id,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    description: issue.description,
    createdAt: issue.createdAt,
    photoCount: issue._count.photos,
    resolutionNote: issue.resolutionNote ?? null,
    context,
  };
}
