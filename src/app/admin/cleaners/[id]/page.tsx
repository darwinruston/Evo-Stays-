import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { InfoTooltip } from "@/components/InfoTooltip";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { formatCurrency } from "@/lib/invoices";
import { formatDate } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { isCleanFinished } from "@/lib/cleans";
import { cleanPrep } from "@/lib/cleanPrep";
import {
  deleteCleaner,
  updateCleanerRate,
  updateCleanerScheduleHorizon,
  assignCleanerProperty,
  removeCleanerProperty,
  reassignUpcomingCleans,
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

      <section className={card("flex flex-wrap items-end gap-3 p-4")}>
        <form action={updateCleanerRate.bind(null, cleaner.id)} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="hourlyRate" className="text-sm font-medium">
              Hourly rate
            </label>
            <input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={cleaner.hourlyRate ?? ""}
              placeholder="e.g. 15.00"
              className={`${inputCompact} w-28`}
            />
          </div>
          <button type="submit" className={button("secondary", "sm")}>
            Save
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          Used to generate invoices — see{" "}
          <Link href="/admin/invoices" className="underline underline-offset-2">
            Invoices
          </Link>
          . Changing it only affects invoices generated after today.
        </p>
      </section>

      <section className={card("flex flex-wrap items-end gap-3 p-4")}>
        <form
          action={updateCleanerScheduleHorizon.bind(null, cleaner.id)}
          className="flex items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="scheduleHorizonDays" className="text-sm font-medium">
              Schedule horizon
            </label>
            <input
              id="scheduleHorizonDays"
              name="scheduleHorizonDays"
              type="number"
              min={0}
              step="1"
              defaultValue={cleaner.scheduleHorizonDays ?? ""}
              placeholder="e.g. 14"
              className={`${inputCompact} w-28`}
            />
          </div>
          <button type="submit" className={button("secondary", "sm")}>
            Save
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          Days ahead &quot;My cleans&quot; shows on their schedule. Leave blank to show everything
          — overdue and past work always shows either way.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Properties{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({cleaner.designatedProperties.length})
          </span>
          <InfoTooltip text="Designating this cleaner on a property makes auto-assign try them first for a new clean there, ahead of the usual familiarity/workload scoring -- a strong preference, not exclusivity. Someone else can still be assigned by hand, or automatically if this cleaner already has a full day." />
        </h2>

        {cleaner.designatedProperties.length > 0 && (
          <ul className="flex flex-col gap-2">
            {cleaner.designatedProperties.map((d) => (
              <li key={d.id} className={card("flex items-center justify-between gap-3 p-4")}>
                <div className="min-w-0">
                  <p className="font-medium">{propertyDisplayName(d.property)}</p>
                  <p className="truncate text-sm text-zinc-500">{d.property.client.name}</p>
                </div>
                <form action={removeCleanerProperty.bind(null, cleaner.id, d.propertyId)}>
                  <button type="submit" className="shrink-0 text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {availableProperties.length > 0 ? (
          <form
            action={assignCleanerProperty.bind(null, cleaner.id)}
            className={card("flex flex-wrap items-end gap-3 p-4")}
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="propertyId" className="text-sm font-medium">
                Property
              </label>
              <select id="propertyId" name="propertyId" required className={inputCompact}>
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {propertyDisplayName(p)} — {p.client.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={button("primary", "sm")}>
              Add
            </button>
          </form>
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
          <form
            action={reassignUpcomingCleans.bind(null, cleaner.id)}
            className={card("flex flex-wrap items-end gap-3 p-4")}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="targetCleanerId" className="text-sm font-medium">
                Reassign to
              </label>
              <select id="targetCleanerId" name="targetCleanerId" required className={inputCompact}>
                {otherCleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fromDate" className="text-sm font-medium">
                From
              </label>
              <input id="fromDate" name="fromDate" type="date" className={`${inputCompact} w-40`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="toDate" className="text-sm font-medium">
                To
              </label>
              <input id="toDate" name="toDate" type="date" className={`${inputCompact} w-40`} />
            </div>
            <button type="submit" className={button("primary", "sm")}>
              Reassign
            </button>
            <p className="w-full text-xs text-zinc-500">
              {pendingCount} upcoming {pendingCount === 1 ? "clean" : "cleans"} not yet started. Leave
              both dates blank to reassign all of them.
            </p>
          </form>
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
