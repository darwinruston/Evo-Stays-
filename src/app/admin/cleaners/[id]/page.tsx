import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { AddPropertyForm } from "@/components/AddPropertyForm";
import { Avatar } from "@/components/Avatar";
import { DesignatedPropertyRow } from "@/components/DesignatedPropertyRow";
import { EditableNumberField } from "@/components/EditableNumberField";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ReassignForm } from "@/components/ReassignForm";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { formatCurrency } from "@/lib/invoices";
import { formatDate } from "@/lib/schedule";
import { badge, button, card } from "@/lib/ui";
import { isCleanFinished } from "@/lib/cleans";
import { cleanPrep } from "@/lib/cleanPrep";
import {
  deleteCleaner,
  updateCleanerRate,
  updateCleanerScheduleHorizon,
  assignCleanerProperty,
  removeCleanerProperty,
  reassignUpcomingCleans,
  reassignPropertyCleansToCleaner,
} from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleaner = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: cleaner?.name ?? "Cleaner" };
}

export default async function CleanerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const cleaner = await prisma.user.findUnique({
    where: { id, role: "CLEANER" },
    include: {
      assignedCleans: {
        orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
        include: {
          property: {
            select: {
              name: true,
              address: true,
              bedrooms: true,
              bathrooms: true,
              maxOccupancy: true,
              sofaBedSleeps: true,
              client: { select: { name: true } },
            },
          },
        },
      },
      designatedProperties: {
        orderBy: { createdAt: "asc" },
        include: { property: { select: { id: true, name: true, address: true, client: { select: { name: true } } } } },
      },
      unavailability: {
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        orderBy: { date: "asc" },
      },
    },
  });
  if (!cleaner) notFound();

  const rows: CleanRow[] = cleaner.assignedCleans.map((c) => ({
    id: c.id,
    href: `/admin/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    subtitle: c.property.client.name,
    status: c.status,
    scheduledFor: c.scheduledFor,
    prep: isCleanFinished(c.status) ? null : cleanPrep(c.property, c.guestCount),
  }));

  const designatedPropertyIds = new Set(cleaner.designatedProperties.map((d) => d.propertyId));
  const availableProperties = await prisma.property.findMany({
    where: { id: { notIn: [...designatedPropertyIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, client: { select: { name: true } } },
  });

  const otherCleaners = await prisma.user.findMany({
    where: { role: "CLEANER", id: { not: cleaner.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const pendingCount = cleaner.assignedCleans.filter((c) => c.status === "PENDING").length;

  // How many of each designated property's upcoming cleans aren't this
  // cleaner's yet -- what "Move cleans here" would actually pick up. Only
  // designating someone (assignCleanerProperty) never touches existing
  // work, so this can be non-zero right after a fresh designation.
  // `OR [null, not: id]` for the same reason as reassignPropertyCleansToCleaner:
  // a plain `not` excludes Unassigned cleans under SQL's NULL semantics.
  const movablePendingCounts =
    cleaner.designatedProperties.length > 0
      ? await prisma.clean.groupBy({
          by: ["propertyId"],
          where: {
            propertyId: { in: cleaner.designatedProperties.map((d) => d.propertyId) },
            status: "PENDING",
            OR: [{ assignedToId: null }, { assignedToId: { not: cleaner.id } }],
          },
          _count: { _all: true },
        })
      : [];
  const movablePendingCountByProperty = new Map(
    movablePendingCounts.map((c) => [c.propertyId, c._count._all]),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/cleaners" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleaners
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <Avatar name={cleaner.name} size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{cleaner.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {cleaner.email}
              {cleaner.hourlyRate !== null && ` · ${formatCurrency(cleaner.hourlyRate)}/hr`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <section className={card("flex flex-col gap-1 p-4")}>
          <label htmlFor="hourlyRate" className="flex items-center gap-1.5 text-sm font-medium">
            Hourly rate
            <InfoTooltip text="Used to generate invoices -- see the Invoices page. Changing it only affects invoices generated after today." />
          </label>
          <EditableNumberField
            id="hourlyRate"
            fieldName="hourlyRate"
            action={updateCleanerRate.bind(null, cleaner.id)}
            value={cleaner.hourlyRate}
            displayValue={cleaner.hourlyRate !== null ? `${formatCurrency(cleaner.hourlyRate)}/hr` : "Not set"}
            placeholder="e.g. 15.00"
            step="0.01"
          />
        </section>

        <section className={card("flex flex-col gap-1 p-4")}>
          <label htmlFor="scheduleHorizonDays" className="flex items-center gap-1.5 text-sm font-medium">
            Schedule horizon
            <InfoTooltip text='Days ahead "My cleans" shows on their schedule. Leave blank to show everything -- overdue and past work always shows either way.' />
          </label>
          <EditableNumberField
            id="scheduleHorizonDays"
            fieldName="scheduleHorizonDays"
            action={updateCleanerScheduleHorizon.bind(null, cleaner.id)}
            value={cleaner.scheduleHorizonDays}
            displayValue={
              cleaner.scheduleHorizonDays !== null ? `${cleaner.scheduleHorizonDays} days` : "Shows everything"
            }
            placeholder="e.g. 14"
          />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Properties{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({cleaner.designatedProperties.length})
          </span>
          <InfoTooltip text="Auto-assign only ever picks from a property's designated cleaners -- never anyone else, and never a guess when there isn't one. A strong preference among designated cleaners, not exclusivity: someone else designated here can still be picked instead if this cleaner already has a full day, or anyone can be assigned by hand regardless." />
        </h2>

        {cleaner.designatedProperties.length > 0 && (
          <ul className="flex flex-col gap-2">
            {cleaner.designatedProperties.map((d) => (
              <DesignatedPropertyRow
                key={d.id}
                propertyName={propertyDisplayName(d.property)}
                clientName={d.property.client.name}
                cleanerName={cleaner.name}
                removeAction={removeCleanerProperty.bind(null, cleaner.id, d.propertyId)}
                moveAction={reassignPropertyCleansToCleaner.bind(null, d.propertyId, cleaner.id)}
                pendingCount={movablePendingCountByProperty.get(d.propertyId) ?? 0}
              />
            ))}
          </ul>
        )}

        {availableProperties.length > 0 ? (
          <AddPropertyForm
            action={assignCleanerProperty.bind(null, cleaner.id)}
            options={availableProperties.map((p) => ({
              id: p.id,
              label: `${propertyDisplayName(p)} — ${p.client.name}`,
            }))}
          />
        ) : (
          cleaner.designatedProperties.length > 0 && (
            <p className="text-sm text-zinc-500">Every property is already designated to this cleaner.</p>
          )
        )}
      </section>

      {cleaner.unavailability.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Unavailable
            <InfoTooltip text="Days this cleaner has blocked themselves, from their own calendar -- auto-assign skips them for anything scheduled on one of these days. You can still assign them by hand; CleanForm just warns you first." />
          </h2>
          <ul className="flex flex-wrap gap-2">
            {cleaner.unavailability.map((u) => (
              <li key={u.id} className={badge()}>
                {formatDate(u.date)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingCount > 0 && otherCleaners.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Reassign upcoming work
            <InfoTooltip text="Moves every not-yet-started clean currently assigned to this cleaner to someone else in one go -- for when they're off sick, on leave, or leaving. Only PENDING cleans move; anything already in progress or completed stays exactly as it is." />
          </h2>
          <ReassignForm
            action={reassignUpcomingCleans.bind(null, cleaner.id)}
            cleaners={otherCleaners}
            pendingCount={pendingCount}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Schedule ({cleaner.assignedCleans.length})
        </h2>
        <CleanList cleans={rows} empty="Nothing assigned to this cleaner yet." />
      </section>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Remove</h2>
        <p className="text-sm text-zinc-600">
          Only possible while this cleaner has no completed cleans on record — history stays
          attributed to whoever actually did the work.
        </p>
        <form action={deleteCleaner.bind(null, cleaner.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Remove cleaner
          </button>
        </form>
      </section>
    </div>
  );
}
