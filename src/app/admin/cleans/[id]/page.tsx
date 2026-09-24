import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffSession } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS, isCleanFinished } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { CleanLogView } from "@/components/CleanLogView";
import { badge, button, card } from "@/lib/ui";
import { cleanPrep } from "@/lib/cleanPrep";
import { IssueList, toIssueRow } from "@/components/IssueList";
import { turnoverFor, formatArrival } from "@/lib/turnover";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isStaffSession())) return { title: "Clean" };
  const clean = await prisma.clean.findUnique({
    where: { id },
    select: { property: { select: { name: true, address: true } } },
  });
  return { title: clean ? `Clean · ${propertyDisplayName(clean.property)}` : "Clean" };
}

export default async function CleanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // Forwarded from the Cleans list's own filter query string (see
  // src/app/admin/cleans/page.tsx) so "← Cleans" can return to the same
  // filtered view instead of always resetting to the unfiltered list.
  searchParams: Promise<{ status?: string; propertyId?: string; cleanerId?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const { status, propertyId, cleanerId } = await searchParams;

  const backParams = new URLSearchParams();
  if (status) backParams.set("status", status);
  if (propertyId) backParams.set("propertyId", propertyId);
  if (cleanerId) backParams.set("cleanerId", cleanerId);
  const backQuery = backParams.toString();
  const backHref = `/admin/cleans${backQuery ? `?${backQuery}` : ""}`;

  const clean = await prisma.clean.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          address: true,
          bedrooms: true,
          bathrooms: true,
          maxOccupancy: true,
          sofaBedSleeps: true,
          client: { select: { id: true, name: true } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      log: {
        include: {
          recordedBy: { select: { name: true } },
          photos: true,
          stockUsage: { include: { stockItem: true } },
        },
      },
      issues: {
        orderBy: { createdAt: "asc" },
        include: { reportedBy: { select: { name: true } }, _count: { select: { photos: true } } },
      },
    },
  });
  if (!clean) notFound();

  const prep = cleanPrep(clean.property, clean.guestCount);
  const turnover = isCleanFinished(clean.status) ? null : await turnoverFor(clean);

  const activity = await prisma.auditLog.findMany({
    where: { entityType: "Clean", entityId: clean.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleans
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link href={`/admin/properties/${clean.property.id}`} className="hover:underline">
                {propertyDisplayName(clean.property)}
              </Link>
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <Link href={`/admin/clients/${clean.property.client.id}`} className="hover:text-zinc-900">
                {clean.property.client.name}
              </Link>
            </p>
          </div>
          <Link href={`/admin/cleans/${clean.id}/edit`} className={button("secondary", "sm")}>
            Edit
          </Link>
        </div>
      </div>

      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Status</span>
          <span className={badge(clean.status === "COMPLETED" ? "solid" : "neutral")}>
            {CLEAN_STATUS_LABELS[clean.status]}
          </span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Scheduled</span>
          <span>{clean.scheduledFor ? formatScheduledFor(clean.scheduledFor) : "Not scheduled"}</span>
        </div>
        {turnover && (
          <div className="flex justify-between gap-6 py-2 text-sm">
            <span className="text-zinc-500">Next guests</span>
            <span className="flex items-center gap-2">
              {turnover.sameDay && <span className={badge("solid")}>Same-day</span>}
              {formatArrival(turnover)}
              {!turnover.arrivalTimeKnown && <span className="text-zinc-400">(time not known)</span>}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Cleaner</span>
          <span>
            {clean.assignedTo ? (
              <Link href={`/admin/cleaners/${clean.assignedTo.id}`} className="hover:underline">
                {clean.assignedTo.name}
              </Link>
            ) : (
              "Unassigned"
            )}
          </span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Guests</span>
          <span>{clean.guestCount ?? "Not set"}</span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Beds to change</span>
          <span>{prep.beds}</span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Bathrooms to clean</span>
          <span>{prep.bathrooms}</span>
        </div>
        {clean.property.sofaBedSleeps !== null && (
          <div className="flex justify-between gap-6 py-2 text-sm">
            <span className="text-zinc-500">Sofa bed</span>
            <span>{prep.sofaBedNeeded ? "Needs preparing" : "Not needed for this booking"}</span>
          </div>
        )}
      </div>

      {clean.instructions && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Instructions</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{clean.instructions}</p>
        </section>
      )}

      {clean.log && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">What happened</h2>
          <CleanLogView log={clean.log} alt={propertyDisplayName(clean.property)} />
        </section>
      )}

      {clean.issues.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Problems reported ({clean.issues.length})</h2>
          <IssueList
            issues={clean.issues.map((i) => toIssueRow(i, i.reportedBy?.name))}
            hrefFor={(issueId) => `/admin/issues/${issueId}`}
          />
        </section>
      )}

      {activity.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Activity</h2>
          <ul className="flex flex-col gap-1.5">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm text-zinc-600">
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
    </div>
  );
}
