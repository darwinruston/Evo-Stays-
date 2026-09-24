"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { propertyDisplayName } from "@/lib/address";
import { notify, issueResolvedNotice } from "@/lib/notify";
import {
  createIssueRecord,
  parseIssueForm,
  IssueFormError,
  issueFormErrorState,
  type IssueFormState,
} from "@/lib/issueRecords";
import {
  ISSUE_CATEGORY_LABELS,
  ISSUE_DESCRIPTION_MAX,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  isIssueSeverity,
  isIssueStatus,
} from "@/lib/issues";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Every page that shows issues or their count. The admin layout carries the
// open-issue badge in the nav, hence the layout-level revalidate.
function revalidateIssueViews(issueId?: string, propertyId?: string, cleanId?: string | null) {
  revalidatePath("/admin/issues");
  if (issueId) revalidatePath(`/admin/issues/${issueId}`);
  if (propertyId) revalidatePath(`/admin/properties/${propertyId}`);
  if (cleanId) {
    revalidatePath(`/admin/cleans/${cleanId}`);
    revalidatePath(`/cleaner/cleans/${cleanId}`);
  }
  revalidatePath("/admin", "layout");
}

// Staff logging a problem themselves -- a guest complaint, something
// spotted on an inspection -- rather than a cleaner reporting it mid-clean.
// No clean behind it, so cleanId stays null.
//
// Returns a rejected submission to IssueForm's useActionState (see
// reportIssue in src/app/cleaner/actions.ts); success redirects away.
export async function createIssue(prev: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const session = await requireStaff();

  let issue;
  try {
    const propertyId = str(formData, "propertyId");
    const property = propertyId
      ? await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } })
      : null;
    if (!property) throw new IssueFormError("Choose a property.");

    issue = await createIssueRecord({
      propertyId: property.id,
      cleanId: null,
      reportedById: session.user.id,
      form: parseIssueForm(formData),
    });
  } catch (err) {
    if (err instanceof IssueFormError) return issueFormErrorState(err, formData, prev);
    throw err;
  }

  revalidateIssueViews(issue.id, issue.propertyId);
  redirect(`/admin/issues/${issue.id}`);
}

// Moving an issue along: Open -> In progress -> Resolved, or back again if
// it turns out not to be fixed after all. resolvedAt/resolvedBy track the
// latest resolution only -- reopening clears them, and the audit log keeps
// the full back-and-forth.
//
// Also where staff correct the system's severity -- triage is theirs.
// Changing it marks the issue severityOverridden (the automatic reason is
// kept as the record of what the system thought).
export async function updateIssue(id: string, formData: FormData) {
  const session = await requireStaff();

  const status = formData.get("status");
  if (!isIssueStatus(status)) throw new Error("Pick a status.");
  const severity = formData.get("severity");
  if (!isIssueSeverity(severity)) throw new Error("Pick a severity.");
  const resolutionNote = str(formData, "resolutionNote");
  if (resolutionNote && resolutionNote.length > ISSUE_DESCRIPTION_MAX) {
    throw new Error(`Keep the note under ${ISSUE_DESCRIPTION_MAX} characters.`);
  }

  const before = await prisma.issue.findUniqueOrThrow({ where: { id } });
  const severityChanged = severity !== before.severity;
  const nowResolved = status === "RESOLVED" && before.status !== "RESOLVED";
  const reopened = status !== "RESOLVED" && before.status === "RESOLVED";

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      status,
      resolutionNote,
      ...(severityChanged ? { severity, severityOverridden: true } : {}),
      ...(nowResolved ? { resolvedAt: new Date(), resolvedById: session.user.id } : {}),
      ...(reopened ? { resolvedAt: null, resolvedById: null } : {}),
    },
    include: {
      property: { select: { name: true, address: true } },
      reportedBy: { select: { id: true, role: true } },
    },
  });

  if (severityChanged) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Issue",
      entityId: id,
      summary: `Severity changed from "${ISSUE_SEVERITY_LABELS[before.severity]}" to "${ISSUE_SEVERITY_LABELS[severity]}"`,
    });
  }

  if (before.status !== status) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Issue",
      entityId: id,
      summary: `Status changed from ${ISSUE_STATUS_LABELS[before.status]} to ${ISSUE_STATUS_LABELS[status]}${
        nowResolved && resolutionNote ? ` — ${resolutionNote}` : ""
      }`,
    });
  } else if ((before.resolutionNote ?? null) !== resolutionNote) {
    // A note-only edit ("plumber booked for Thursday") is progress worth
    // having on the record too, not just status changes.
    await logAudit({
      actorId: session.user.id,
      entityType: "Issue",
      entityId: id,
      summary: resolutionNote ? `Note updated — ${resolutionNote}` : "Note cleared",
    });
  }

  // Only the reporter, and only if it wasn't them who just resolved it.
  if (nowResolved && issue.reportedBy && issue.reportedBy.id !== session.user.id) {
    await notify(issueResolvedNotice(issue.reportedBy, issue, resolutionNote));
  }

  revalidateIssueViews(id, issue.propertyId, issue.cleanId);
}

// For a report made in error or a duplicate -- a genuinely fixed problem
// should be Resolved instead, so its history stays. Photos are left on disk,
// the same trade-off deletePropertyPhoto makes for local storage.
export async function deleteIssue(id: string) {
  const session = await requireStaff();

  const issue = await prisma.issue.findUniqueOrThrow({
    where: { id },
    include: { property: { select: { name: true, address: true } } },
  });
  await prisma.issue.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    entityType: "Issue",
    entityId: id,
    summary: `Deleted — ${ISSUE_CATEGORY_LABELS[issue.category]} at ${propertyDisplayName(issue.property)}`,
  });

  revalidateIssueViews(undefined, issue.propertyId, issue.cleanId);
  redirect("/admin/issues");
}
