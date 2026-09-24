import { prisma } from "@/lib/prisma";
import { savePropertyPhotos } from "@/lib/uploads";
import { notify, staffUserIds, issueReportedNotices } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { propertyDisplayName } from "@/lib/address";
import { isAllowedImageType } from "@/lib/imageTypes";
import type { IssueCategory } from "@prisma/client";
import { ISSUE_CATEGORY_LABELS, ISSUE_DESCRIPTION_MAX, ISSUE_SEVERITY_LABELS, isIssueCategory } from "@/lib/issues";
import { assessIssueSeverity } from "@/lib/issueSeverity";
import { nextArrivalFrom } from "@/lib/turnover";

// What the issue forms (src/components/IssueForm.tsx) get back from their
// action: an error to show inline, with what was typed so the form can put
// it back, rather than a thrown exception -- which production renders as a
// bare error page with the message hidden, losing the whole report.
// `attempt` changes on every submission so the form remounts its fields
// with these values as their defaults.
export type IssueFormState = {
  error?: string;
  sent?: boolean;
  attempt?: number;
  values?: { category?: string; description?: string; propertyId?: string };
};

// A problem with what was submitted, as opposed to anything else going
// wrong -- only these are turned into an inline message; anything else
// still throws to the error boundary.
export class IssueFormError extends Error {}

// The fields IssueFields (src/components/IssueFields.tsx) submits, read and
// validated once here for both the cleaner's mid-clean report and staff's
// "Log an issue" form -- a server action is reachable by direct POST, so
// the options on screen aren't the validation. There's no severity field:
// that's worked out by the system (see createIssueRecord), never chosen by
// whoever reports it.
export function parseIssueForm(formData: FormData): {
  category: IssueCategory;
  description: string;
  photos: File[];
} {
  const category = formData.get("category");
  const rawDescription = formData.get("description");
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";

  if (!isIssueCategory(category)) throw new IssueFormError("Pick what's wrong.");
  if (!description) throw new IssueFormError("Describe the problem.");
  if (description.length > ISSUE_DESCRIPTION_MAX) {
    throw new IssueFormError(`Keep the description under ${ISSUE_DESCRIPTION_MAX} characters.`);
  }

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  // Checked here, before anything is saved, so a bad file is an inline
  // message on the form -- savePropertyPhotos would otherwise throw it
  // mid-way as an unhandled error.
  const rejected = photos.find((f) => !isAllowedImageType(f.type));
  if (rejected) {
    throw new IssueFormError(
      `"${rejected.name}" isn't a supported photo (JPEG, PNG, WebP or HEIC) — pick your photos again.`,
    );
  }
  return { category, description, photos };
}

// The state to hand back after a rejected submission: the message plus
// everything typed (files can't be put back into a file input, which is
// why the photo error above says to pick them again).
export function issueFormErrorState(err: IssueFormError, formData: FormData, prev: IssueFormState): IssueFormState {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : undefined;
  };
  return {
    error: err.message,
    attempt: (prev.attempt ?? 0) + 1,
    values: {
      category: text("category"),
      description: text("description"),
      propertyId: text("propertyId"),
    },
  };
}

// Shared by both entry points: works out the severity, saves the photos
// under the property's own folder (so /api/photos's per-property access
// check covers them with no new rule), records the issue, and tells staff.
// Photos are written before the row so a rejected file type fails the whole
// report up front, rather than leaving an issue behind that silently lost
// its evidence.
//
// Severity comes from assessIssueSeverity -- what's wrong, the property's
// bathroom count, and when the next guests are due -- so it's the same
// answer whoever reports it. Staff can override it afterwards.
export async function createIssueRecord(input: {
  propertyId: string;
  cleanId: string | null;
  reportedById: string;
  form: ReturnType<typeof parseIssueForm>;
}) {
  const { category, description, photos } = input.form;
  const now = new Date();
  const [property, nextArrival] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: input.propertyId }, select: { bathrooms: true } }),
    nextArrivalFrom(input.propertyId, now),
  ]);
  const { severity, reason } = assessIssueSeverity({ category, bathrooms: property.bathrooms, nextArrival, now });

  const paths = await savePropertyPhotos(input.propertyId, photos);

  const issue = await prisma.issue.create({
    data: {
      propertyId: input.propertyId,
      cleanId: input.cleanId,
      reportedById: input.reportedById,
      category,
      severity,
      severityReason: reason,
      description,
      photos: { create: paths.map((path) => ({ path })) },
    },
    include: { property: { select: { name: true, address: true } } },
  });

  await logAudit({
    actorId: input.reportedById,
    entityType: "Issue",
    entityId: issue.id,
    summary: `Reported — ${ISSUE_CATEGORY_LABELS[category]} at ${propertyDisplayName(issue.property)}; assessed as "${ISSUE_SEVERITY_LABELS[severity]}"`,
  });

  await notify(issueReportedNotices(await staffUserIds(), issue, input.reportedById));

  return issue;
}
