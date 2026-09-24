import Link from "next/link";
import { notFound } from "next/navigation";
import type { IssueSeverity, IssueStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffSession } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatScheduledFor } from "@/lib/schedule";
import {
  ISSUE_CATEGORY_LABELS,
  ISSUE_DESCRIPTION_MAX,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
} from "@/lib/issues";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { updateIssue, deleteIssue } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isStaffSession())) return { title: "Issue" };
  const issue = await prisma.issue.findUnique({
    where: { id },
    select: { category: true, property: { select: { name: true, address: true } } },
  });
  return {
    title: issue ? `${ISSUE_CATEGORY_LABELS[issue.category]} · ${propertyDisplayName(issue.property)}` : "Issue",
  };
}

const STATUSES = Object.keys(ISSUE_STATUS_LABELS) as IssueStatus[];
// Most urgent first in the picker, matching how lists are ordered.
const SEVERITIES: IssueSeverity[] = ["URGENT", "MEDIUM", "LOW"];

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, address: true, client: { select: { id: true, name: true } } } },
      clean: { select: { id: true, scheduledFor: true } },
      reportedBy: { select: { name: true } },
      resolvedBy: { select: { name: true } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!issue) notFound();

  const activity = await prisma.auditLog.findMany({
    where: { entityType: "Issue", entityId: issue.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  const title = propertyDisplayName(issue.property);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/admin/issues" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Issues
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{ISSUE_CATEGORY_LABELS[issue.category]}</h1>
          <span className={badge(issue.severity === "URGENT" ? "solid" : "outline")}>
            {ISSUE_SEVERITY_LABELS[issue.severity]}
          </span>
          <span className={badge(issue.status === "RESOLVED" ? "neutral" : "outline")}>
            {ISSUE_STATUS_LABELS[issue.status]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-zinc-500">
          <Link href={`/admin/properties/${issue.property.id}`} className="hover:text-zinc-900 hover:underline">
            {title}
          </Link>{" "}
          ·{" "}
          <Link href={`/admin/clients/${issue.property.client.id}`} className="hover:text-zinc-900">
            {issue.property.client.name}
          </Link>
        </p>
      </div>

      <p className="text-sm whitespace-pre-line text-zinc-700 [overflow-wrap:anywhere]">{issue.description}</p>

      {issue.photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {issue.photos.map((p) => (
            <li key={p.id} className={card("overflow-hidden")}>
              {/* Full-size in a new tab -- damage evidence is worth zooming into. */}
              <a href={`/api/photos/${p.path}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.path}`} alt={`${title} — reported problem`} className="h-40 w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        {/* How the severity was decided -- the system's reasoning, or that
            staff have since changed it. Cleaners never set this. */}
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="shrink-0 text-zinc-500">Severity</span>
          <span className="min-w-0 text-right [overflow-wrap:anywhere]">
            {ISSUE_SEVERITY_LABELS[issue.severity]}
            <span className="block text-xs text-zinc-500">
              {issue.severityOverridden
                ? `Set by staff${issue.severityReason ? ` · system said: ${issue.severityReason}` : ""}`
                : issue.severityReason
                  ? `Worked out automatically: ${issue.severityReason}`
                  : "Worked out automatically"}
            </span>
          </span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Reported</span>
          <span className="text-right">
            {formatScheduledFor(issue.createdAt)} · {issue.reportedBy?.name ?? "Unknown"}
          </span>
        </div>
        {issue.clean && (
          <div className="flex justify-between gap-6 py-2 text-sm">
            <span className="text-zinc-500">Found during</span>
            <Link href={`/admin/cleans/${issue.clean.id}`} className="hover:underline">
              Clean{issue.clean.scheduledFor ? ` on ${formatScheduledFor(issue.clean.scheduledFor)}` : ""}
            </Link>
          </div>
        )}
        {issue.resolvedAt && (
          <div className="flex justify-between gap-6 py-2 text-sm">
            <span className="text-zinc-500">Resolved</span>
            <span className="text-right">
              {formatScheduledFor(issue.resolvedAt)} · {issue.resolvedBy?.name ?? "Unknown"}
            </span>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Progress</h2>
        <form action={updateIssue.bind(null, issue.id)} className={card("flex flex-col gap-4 p-4")}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select id="status" name="status" defaultValue={issue.status} className={`${inputCompact} sm:w-60`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="severity" className="text-sm font-medium">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              defaultValue={issue.severity}
              className={`${inputCompact} sm:w-60`}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              {issue.severityOverridden
                ? "Changed by staff from what the system worked out."
                : `${capitalise(issue.severityReason ?? "worked out from what's wrong and when the next guests are due")}. Change it if you know better.`}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="resolutionNote" className="text-sm font-medium">
              What&apos;s been done <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="resolutionNote"
              name="resolutionNote"
              rows={3}
              maxLength={ISSUE_DESCRIPTION_MAX}
              defaultValue={issue.resolutionNote ?? ""}
              placeholder="e.g. Plumber booked for Thursday; shower tray replaced."
              className={inputCompact}
            />
            <p className="text-xs text-zinc-500">
              Whoever reported it is notified when it&apos;s marked resolved, with this note.
            </p>
          </div>
          <button type="submit" className={`w-fit ${button("primary", "sm")}`}>
            Save
          </button>
        </form>
      </section>

      {activity.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Activity</h2>
          <ul className="flex flex-col gap-1.5">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm text-zinc-600 [overflow-wrap:anywhere]">
                {entry.summary}
                <span className="text-zinc-400">
                  {" "}
                  — {formatScheduledFor(entry.createdAt)} · {entry.actor?.name ?? "Unknown"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tucked away -- deleting is for reports made in error; a real problem
          that's been fixed should be Resolved so its history stays. */}
      <details className="w-fit">
        <summary className="cursor-pointer text-xs text-zinc-500">Delete this issue</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-zinc-500">Only for a duplicate or a report made by mistake.</p>
          <form action={deleteIssue.bind(null, issue.id)}>
            <button type="submit" className={button("danger", "sm")}>
              Delete issue
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
