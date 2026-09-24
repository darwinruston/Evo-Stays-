import type { IssueCategory, IssueSeverity, NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { propertyDisplayName } from "@/lib/address";
import { ISSUE_CATEGORY_LABELS, ISSUE_SEVERITY_LABELS } from "@/lib/issues";
import { formatScheduledFor } from "@/lib/schedule";
import { absoluteUrl, emailConfigured, sendEmail } from "@/lib/email";
import { SYSTEM_USER_ID } from "@/lib/systemUser";

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
};

// Records every notice in-app, then emails each recipient ONE message
// covering everything addressed to them in this call -- a first sync of a
// newly connected listing can create a dozen cleans at once, and that
// should land as one "3 new cleans" email, not a dozen separate ones. So
// callers that produce several notices in one go (the syncs, bulk
// reassignment) collect them and call this once at the end.
//
// Never throws: a notification is a side effect of a change that has
// already been saved, and failing to tell someone about it must not turn
// into the change itself looking like it failed. Email goes out
// fire-and-forget for the same reason -- an SMTP round trip shouldn't hold
// up the staff member's form submission.
export async function notify(items: NotificationInput[]): Promise<void> {
  if (items.length === 0) return;
  let created: RecordedNotification[];
  try {
    // ...AndReturn so each email line can link through its own row's
    // /notifications/{id} -- following it from an inbox then marks it read
    // in the app too, exactly like clicking it in the list.
    created = await prisma.notification.createManyAndReturn({
      data: items.map((n) => ({
        userId: n.userId,
        kind: n.kind,
        title: n.title,
        body: n.body ?? null,
        href: n.href ?? null,
      })),
      select: { id: true, userId: true, title: true, body: true },
    });
  } catch (err) {
    console.error("[notify] couldn't record notifications:", err);
    return;
  }

  if (emailConfigured()) {
    emailNotifications(created).catch((err) => {
      console.error("[notify] couldn't send notification email:", err);
    });
  }
}

type RecordedNotification = { id: string; userId: string; title: string; body: string | null };

async function emailNotifications(items: RecordedNotification[]): Promise<void> {
  const byUser = new Map<string, RecordedNotification[]>();
  for (const item of items) {
    const list = byUser.get(item.userId);
    if (list) list.push(item);
    else byUser.set(item.userId, [item]);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] }, emailNotifications: true },
    select: { id: true, email: true, name: true },
  });

  for (const user of users) {
    const notices = byUser.get(user.id)!;
    const lines = notices.map((n) => {
      // Every line links, even a notice with no destination of its own --
      // /notifications/{id} marks it read and falls back to the list.
      const link = absoluteUrl(`/notifications/${n.id}`);
      return [`• ${n.title}`, n.body ? `  ${n.body}` : null, link ? `  ${link}` : null]
        .filter(Boolean)
        .join("\n");
    });
    const subject = notices.length === 1 ? notices[0].title : `${notices.length} updates from Evo Stays`;
    const settingsLink = absoluteUrl("/notifications");
    const text = [
      `Hi ${user.name},`,
      "",
      ...lines,
      "",
      settingsLink
        ? `Manage email notifications: ${settingsLink}`
        : "You can turn these emails off from your Notifications page.",
    ].join("\n");
    await sendEmail({ to: user.email, subject, text });
  }
}

// Everyone who manages the schedule -- ADMIN and OFFICE -- minus the
// "Automated sync" system account, which is an ADMIN for permission
// purposes but isn't a person anyone reads notifications as.
export async function staffUserIds(): Promise<string[]> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "OFFICE"] }, id: { not: SYSTEM_USER_ID } },
    select: { id: true },
  });
  return staff.map((s) => s.id);
}

// The shape every clean notice below needs -- enough to write a message
// that stands on its own, whether the caller has just loaded, updated or
// deleted the clean.
export type CleanNoticeRef = {
  id: string;
  scheduledFor: Date | null;
  property: { name: string | null; address: string };
};

function when(date: Date | null): string {
  return date ? formatScheduledFor(date) : "not yet scheduled";
}

// A clean that's already in the past (Hostify sync reconciles bookings up to
// a week back, for late cancellations) isn't something anyone needs pinging
// about -- nobody's going to go and do it now. Unscheduled cleans still
// count: they're upcoming work, just without a date yet.
function isUpcoming(clean: CleanNoticeRef, now = new Date()): boolean {
  if (!clean.scheduledFor) return true;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return clean.scheduledFor >= startOfToday;
}

export function cleanAssignedNotice(
  userId: string,
  clean: CleanNoticeRef,
  reason: "new" | "reassigned" | "reinstated" = "new",
): NotificationInput[] {
  if (!isUpcoming(clean)) return [];
  const title = {
    new: `New clean: ${propertyDisplayName(clean.property)}`,
    reassigned: `Clean assigned to you: ${propertyDisplayName(clean.property)}`,
    reinstated: `Clean back on: ${propertyDisplayName(clean.property)}`,
  }[reason];
  return [
    {
      userId,
      kind: "CLEAN_ASSIGNED",
      title,
      body: when(clean.scheduledFor),
      href: `/cleaner/cleans/${clean.id}`,
    },
  ];
}

// No href -- the clean is no longer theirs, so /cleaner/cleans/{id} would
// just 404 for them now. `toSomeoneElse` false means it was simply taken off
// them (left Unassigned), which shouldn't claim someone else has it.
export function cleanUnassignedNotice(
  userId: string,
  clean: CleanNoticeRef,
  toSomeoneElse = true,
): NotificationInput[] {
  if (!isUpcoming(clean)) return [];
  const where = propertyDisplayName(clean.property);
  return [
    {
      userId,
      kind: "CLEAN_UNASSIGNED",
      title: toSomeoneElse ? `Clean moved to someone else: ${where}` : `Clean taken off your schedule: ${where}`,
      body: clean.scheduledFor
        ? `${formatScheduledFor(clean.scheduledFor)} is no longer on your schedule.`
        : "It's no longer on your schedule.",
    },
  ];
}

export function cleanRescheduledNotice(
  userId: string,
  clean: CleanNoticeRef,
  from: Date | null,
): NotificationInput[] {
  if (!isUpcoming(clean)) return [];
  // A sync can re-save a booking whose checkout didn't actually move (only
  // its check-in or status changed) -- "moved from 25 Sept to 25 Sept" is
  // not news.
  if ((from?.getTime() ?? null) === (clean.scheduledFor?.getTime() ?? null)) return [];
  const body = !clean.scheduledFor
    ? `Taken off ${when(from)} — not rescheduled yet.`
    : !from
      ? `Now scheduled for ${formatScheduledFor(clean.scheduledFor)}.`
      : `Moved from ${formatScheduledFor(from)} to ${formatScheduledFor(clean.scheduledFor)}.`;
  return [
    {
      userId,
      kind: "CLEAN_RESCHEDULED",
      title: `Clean rescheduled: ${propertyDisplayName(clean.property)}`,
      body,
      href: `/cleaner/cleans/${clean.id}`,
    },
  ];
}

// href only while the clean still exists -- a deleted one has nowhere to go.
export function cleanCancelledNotice(
  userId: string,
  clean: CleanNoticeRef,
  opts: { deleted?: boolean; reason?: string } = {},
): NotificationInput[] {
  if (!isUpcoming(clean)) return [];
  return [
    {
      userId,
      kind: "CLEAN_CANCELLED",
      title: `Clean cancelled: ${propertyDisplayName(clean.property)}`,
      body: `${clean.scheduledFor ? `${formatScheduledFor(clean.scheduledFor)} — no need to go.` : "No need to go."}${opts.reason ? ` ${opts.reason}` : ""}`,
      href: opts.deleted ? null : `/cleaner/cleans/${clean.id}`,
    },
  ];
}

export function cleanNeedsCleanerNotices(staffIds: string[], clean: CleanNoticeRef): NotificationInput[] {
  if (!isUpcoming(clean)) return [];
  return staffIds.map((userId) => ({
    userId,
    kind: "CLEAN_NEEDS_CLEANER" as const,
    title: `Needs a cleaner: ${propertyDisplayName(clean.property)}`,
    body: `${when(clean.scheduledFor)} — no designated cleaner was free, so it's Unassigned.`,
    href: `/admin/cleans/${clean.id}/edit`,
  }));
}

export type CleanSnapshot = {
  id: string;
  assignedToId: string | null;
  scheduledFor: Date | null;
  status: string;
  property: { name: string | null; address: string };
};

// Who needs telling about one edit, from the before/after of the row. An
// edit can change the cleaner, the date and the status all at once, so the
// cases are ordered to send each person the single notice that matters most
// to them rather than a pile: a cleaner who just lost the clean doesn't also
// need to hear it was rescheduled, and one who just gained it hears about
// it at its new date. Cancelling trumps everything -- nothing else about a
// clean that isn't happening is worth reading.
export function cleanEditNotices(before: CleanSnapshot, after: CleanSnapshot): NotificationInput[] {
  // Work that's already done isn't anyone's to go and do -- moving a
  // completed clean between cleaners (a records correction) tells nobody.
  if (before.status === "COMPLETED" || after.status === "COMPLETED") return [];

  if (after.status === "CANCELLED" && before.status !== "CANCELLED") {
    return before.assignedToId ? cleanCancelledNotice(before.assignedToId, after) : [];
  }
  if (after.status === "CANCELLED") return [];

  // Reopened from CANCELLED. "Back on" only makes sense to the cleaner who
  // had it before it was cancelled; if the same edit gave it to someone
  // else, to them it's simply a new clean. The previous holder already
  // heard it was cancelled, so there's nothing more to tell them.
  if (before.status === "CANCELLED") {
    if (!after.assignedToId) return [];
    return cleanAssignedNotice(
      after.assignedToId,
      after,
      after.assignedToId === before.assignedToId ? "reinstated" : "reassigned",
    );
  }

  const notices: NotificationInput[] = [];
  if (before.assignedToId !== after.assignedToId) {
    if (before.assignedToId) {
      notices.push(...cleanUnassignedNotice(before.assignedToId, before, after.assignedToId !== null));
    }
    if (after.assignedToId) notices.push(...cleanAssignedNotice(after.assignedToId, after, "reassigned"));
  } else if (after.assignedToId) {
    notices.push(...cleanRescheduledNotice(after.assignedToId, after, before.scheduledFor));
  }
  return notices;
}

export type IssueNoticeRef = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  severityReason: string | null;
  description: string;
  cleanId: string | null;
  property: { name: string | null; address: string };
};

function excerpt(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

// To every staff member except whoever reported it -- an office user
// logging a guest complaint doesn't need a notification about their own
// report. Urgent ones say so up front, since the title is all that shows in
// an inbox preview; the body carries the system's reason for the severity
// (see assessIssueSeverity) ahead of what was reported.
export function issueReportedNotices(
  staffIds: string[],
  issue: IssueNoticeRef,
  reportedById: string,
): NotificationInput[] {
  const where = propertyDisplayName(issue.property);
  const what = ISSUE_CATEGORY_LABELS[issue.category].toLowerCase();
  const title =
    issue.severity === "URGENT" ? `Urgent: ${what} at ${where}` : `Issue reported: ${what} at ${where}`;
  return staffIds
    .filter((id) => id !== reportedById)
    .map((userId) => ({
      userId,
      kind: "ISSUE_REPORTED" as const,
      title,
      body: `${ISSUE_SEVERITY_LABELS[issue.severity]}${issue.severityReason ? ` — ${issue.severityReason}` : ""}. “${excerpt(issue.description)}”`,
      href: `/admin/issues/${issue.id}`,
    }));
}

// Closes the loop with whoever reported it, so a cleaner who flagged a
// broken boiler hears it's been dealt with rather than wondering whether
// anyone read it. Staff land on the issue itself; a cleaner has no issues
// page, so they land on the clean they reported it from (if any).
export function issueResolvedNotice(
  reporter: { id: string; role: string },
  issue: IssueNoticeRef,
  resolutionNote: string | null,
): NotificationInput[] {
  const href =
    reporter.role === "CLEANER"
      ? issue.cleanId
        ? `/cleaner/cleans/${issue.cleanId}`
        : null
      : `/admin/issues/${issue.id}`;
  return [
    {
      userId: reporter.id,
      kind: "ISSUE_RESOLVED",
      title: `Resolved: ${ISSUE_CATEGORY_LABELS[issue.category].toLowerCase()} at ${propertyDisplayName(issue.property)}`,
      body: resolutionNote ? excerpt(resolutionNote) : excerpt(issue.description),
      href,
    },
  ];
}

// The notices a newly created clean warrants, whoever created it: the
// assignee hears it's theirs, or -- for a clean a sync couldn't place --
// staff hear it needs someone. A clean staff created by hand and left
// Unassigned produces nothing: they already know, they just made it.
export function newCleanNotices(
  clean: CleanNoticeRef & { assignedToId: string | null },
  opts: { staffIds?: string[] } = {},
): NotificationInput[] {
  if (clean.assignedToId) return cleanAssignedNotice(clean.assignedToId, clean, "new");
  return opts.staffIds ? cleanNeedsCleanerNotices(opts.staffIds, clean) : [];
}
