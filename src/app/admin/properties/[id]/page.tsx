import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffSession } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { FetchCoverPhotoButton } from "@/components/FetchCoverPhotoButton";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StockLevelIndicator } from "@/components/StockLevelIndicator";
import { StockLevelToggle } from "@/components/StockLevelToggle";
import { stockLevelBand } from "@/lib/stock";
import { formatCurrency, formatHours, formatPeriod } from "@/lib/invoices";
import { formatDate, formatScheduledFor } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import {
  addPropertyPhotos,
  setPrimaryPhoto,
  deletePropertyPhoto,
  addPropertyStockLevel,
  updatePropertyStockPar,
  setPropertyStockLevel,
  removePropertyStockLevel,
  updatePropertyMinBillableHours,
  addPropertyCalendarFeed,
  removePropertyCalendarFeed,
  syncPropertyCalendarFeed,
  updatePropertySyncHorizon,
  updatePropertyHostifyListingId,
  removePropertyHostifyListing,
  syncPropertyHostifyListing,
  fetchPropertyCoverPhoto,
  addPropertyChecklistItem,
  removePropertyChecklistItem,
} from "../actions";
import { CleaningChecklist } from "@/components/CleaningChecklist";
import { CHECKLIST_ROOM_MAX, CHECKLIST_TEXT_MAX, STANDARD_ROOMS } from "@/lib/cleaningChecklist";
import { setLaundryLoadCollected } from "../../laundry/actions";
import { IssueList, toIssueRow } from "@/components/IssueList";
import { sortIssuesByUrgency } from "@/lib/issues";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isStaffSession())) return { title: "Property" };
  const property = await prisma.property.findUnique({
    where: { id },
    select: { name: true, address: true },
  });
  return { title: property ? propertyDisplayName(property) : "Property" };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, hostifyApiKey: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      stockLevels: { orderBy: { createdAt: "asc" }, include: { stockItem: true } },
      invoices: {
        orderBy: { periodStart: "desc" },
        include: { cleaner: { select: { id: true, name: true } } },
      },
      calendarFeeds: { orderBy: { createdAt: "asc" } },
      designatedCleaners: {
        orderBy: { createdAt: "asc" },
        include: { cleaner: { select: { id: true, name: true } } },
      },
      checklistItems: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!property) notFound();

  const cleanCount = await prisma.clean.count({ where: { propertyId: property.id } });

  const [openIssues, issueCount] = await Promise.all([
    prisma.issue.findMany({
      where: { propertyId: property.id, status: { not: "RESOLVED" } },
      include: { reportedBy: { select: { name: true } }, _count: { select: { photos: true } } },
    }),
    prisma.issue.count({ where: { propertyId: property.id } }),
  ]);

  const configuredItemIds = new Set(property.stockLevels.map((l) => l.stockItemId));
  const availableItems = await prisma.stockItem.findMany({
    where: { active: true, id: { notIn: [...configuredItemIds] } },
    orderBy: { name: "asc" },
  });

  // Loads still out at the laundrette that include at least one visit at
  // this property. Filtered to collectedAt: null, not just fetched and
  // hidden -- once a load is marked collected it stops matching this query
  // on its own, which is what keeps this section from clogging up with old
  // resolved drop-offs.
  const laundryOut = await prisma.laundryLoad.findMany({
    where: { collectedAt: null, logs: { some: { clean: { propertyId: property.id } } } },
    orderBy: { createdAt: "desc" },
    include: {
      facility: { select: { name: true } },
      recordedBy: { select: { name: true } },
      logs: { include: { clean: { include: { property: { select: { id: true, name: true, address: true } } } } } },
    },
  });

  const hasHostifyListing = property.hostifyListingId !== null;

  // Shared by whichever sync source is actually active -- hostifySync
  // respects this cutoff exactly the same way calendar sync does, so it
  // isn't Calendars-specific even though it originally lived there. Lives
  // under Calendars while that's the active source, and under Hostify once
  // a listing's linked (see the placement below).
  const syncHorizonControl = (
    <details className="w-fit">
      <summary className="cursor-pointer list-none text-xs text-zinc-500 underline decoration-dotted decoration-zinc-300 underline-offset-2 hover:text-zinc-700 [&::-webkit-details-marker]:hidden">
        {property.syncHorizonDays !== null
          ? `Only creating cleans up to ${property.syncHorizonDays} days out`
          : "No limit on how far out cleans are created"}
      </summary>
      <form
        action={updatePropertySyncHorizon.bind(null, property.id)}
        className="mt-2 flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="syncHorizonDays" className="text-xs text-zinc-500">
            Days ahead
          </label>
          <input
            id="syncHorizonDays"
            name="syncHorizonDays"
            type="number"
            min={0}
            defaultValue={property.syncHorizonDays ?? ""}
            placeholder="e.g. 31"
            className={`${inputCompact} w-24`}
          />
        </div>
        <button type="submit" className={button("secondary", "sm")}>
          Save
        </button>
        <p className="w-full text-xs text-zinc-500">Clear the field and save to remove the limit.</p>
      </form>
    </details>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/properties" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Properties
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{propertyDisplayName(property)}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <Link href={`/admin/clients/${property.client.id}`} className="hover:text-zinc-900">
                {property.client.name}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/admin/cleans?propertyId=${property.id}`} className={button("secondary", "sm")}>
              Cleans ({cleanCount})
            </Link>
            <Link href={`/admin/properties/${property.id}/edit`} className={button("secondary", "sm")}>
              Edit
            </Link>
          </div>
        </div>
      </div>

      <PropertyDetails property={property} />

      {/* Up top, straight after the property itself -- an open problem here
          (especially one marked "before next guests") is the thing most
          worth seeing on arrival at this page. */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Open issues <span className="text-sm font-normal text-zinc-500">({openIssues.length})</span>
            <InfoTooltip text="Problems reported here and not yet resolved — damage, repairs, missing items, lost property. Cleaners report them from the clean they're on; staff can log one too." />
          </h2>
          <div className="flex items-center gap-3">
            {issueCount > openIssues.length && (
              <Link
                href={`/admin/issues?view=all&propertyId=${property.id}`}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                All issues ({issueCount})
              </Link>
            )}
            <Link href={`/admin/issues/new?propertyId=${property.id}`} className={button("secondary", "sm")}>
              Log an issue
            </Link>
          </div>
        </div>
        {openIssues.length > 0 ? (
          <IssueList
            issues={sortIssuesByUrgency(openIssues).map((i) => toIssueRow(i, i.reportedBy?.name))}
            hrefFor={(issueId) => `/admin/issues/${issueId}`}
          />
        ) : (
          <p className="text-sm text-zinc-500">Nothing reported that still needs dealing with.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Cleaners{" "}
          <span className="text-sm font-normal text-zinc-500">({property.designatedCleaners.length})</span>
          <InfoTooltip text="Cleaners designated as the regular/preferred worker for this property — a new clean here is offered to this pool first, before falling back to auto-assign's wider scoring." />
        </h2>
        {property.designatedCleaners.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {property.designatedCleaners.map((dc) => (
              <li key={dc.id}>
                <Link
                  href={`/admin/cleaners/${dc.cleaner.id}`}
                  className={card("block p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  {dc.cleaner.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            No cleaner designated yet — set one from the{" "}
            <Link href="/admin/cleaners" className="underline underline-offset-2">
              Cleaners
            </Link>{" "}
            page.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Cleaning checklist{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({property.checklistItems.length} extra {property.checklistItems.length === 1 ? "item" : "items"})
          </span>
          <InfoTooltip text="Every property gets the standard turnover checklist. Add anything particular to this one — a hot tub, a garden, a quirk of the boiler — and cleaners see it marked on their checklist here. Use a standard room (Kitchen, Bathroom…) to add to that card, or any other name for a card of its own." />
        </h2>

        {property.checklistItems.length > 0 && (
          <ul className="flex flex-col gap-2">
            {property.checklistItems.map((item) => (
              <li key={item.id} className={card("flex items-center justify-between gap-3 p-4")}>
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className="text-xs text-zinc-500">{item.room}</p>
                  <p className="text-sm">{item.text}</p>
                </div>
                <form action={removePropertyChecklistItem.bind(null, property.id, item.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addPropertyChecklistItem.bind(null, property.id)}
          className={card("flex flex-wrap items-end gap-3 p-4")}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checklistRoom" className="text-sm font-medium">
              Room
            </label>
            <input
              id="checklistRoom"
              name="room"
              required
              maxLength={CHECKLIST_ROOM_MAX}
              list="checklistRooms"
              placeholder="e.g. Kitchen, Hot tub"
              className={`${inputCompact} w-44`}
            />
            {/* Suggests the standard rooms plus any this property already
                uses, so additions land in an existing card by default. */}
            <datalist id="checklistRooms">
              {[...new Set([...STANDARD_ROOMS, ...property.checklistItems.map((i) => i.room)])].map((room) => (
                <option key={room} value={room} />
              ))}
            </datalist>
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <label htmlFor="checklistText" className="text-sm font-medium">
              What needs doing
            </label>
            <input
              id="checklistText"
              name="text"
              required
              maxLength={CHECKLIST_TEXT_MAX}
              placeholder="e.g. Check hot tub chemicals, cover back on"
              className={inputCompact}
            />
          </div>
          <button type="submit" className={button("primary", "sm")}>
            Add
          </button>
        </form>

        <details className="w-fit">
          <summary className="cursor-pointer text-xs text-zinc-500 underline decoration-dotted decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
            Preview what cleaners see
          </summary>
          <div className="mt-2 max-w-md">
            <CleaningChecklist extras={property.checklistItems} />
          </div>
        </details>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Stock <span className="text-sm font-normal text-zinc-500">({property.stockLevels.length})</span>
          <InfoTooltip text="Nobody counts bin bags exactly, before or after topping them up — set the level the same way a cleaner records it. Par is the one real number here: what a full restock brings this property up to, e.g. a pack or order size (6 hand soaps, 50 bin bags), not the bare minimum needed." />
        </h2>

        {property.stockLevels.length > 0 && (
          <ul className="flex flex-col gap-2">
            {property.stockLevels.map((level) => (
              <li key={level.id} className={card("flex flex-col gap-3 p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{level.stockItem.name}</p>
                    {/* Par is a one-time setup fact (a pack or order size),
                        not something that needs adjusting on every visit --
                        tucked behind this same line instead of a separate
                        section, so editing it stays contained and compact. */}
                    <details className="group/par">
                      <summary className="w-fit cursor-pointer list-none text-xs text-zinc-500 underline decoration-dotted decoration-zinc-300 underline-offset-2 hover:text-zinc-700 [&::-webkit-details-marker]:hidden">
                        Par {level.parQty}
                        {level.stockItem.unit ? ` ${level.stockItem.unit}` : ""}
                      </summary>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form
                          action={updatePropertyStockPar.bind(null, property.id, level.id)}
                          className="flex items-center gap-2"
                        >
                          <input
                            name="parQty"
                            type="number"
                            min={1}
                            defaultValue={level.parQty}
                            className={`${inputCompact} w-16`}
                          />
                          <button type="submit" className={button("secondary", "sm")}>
                            Save
                          </button>
                        </form>
                        <form action={removePropertyStockLevel.bind(null, property.id, level.id)}>
                          <button type="submit" className="text-xs text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                  <StockLevelIndicator level={level} />
                </div>

                <StockLevelToggle
                  action={setPropertyStockLevel.bind(null, property.id, level.id)}
                  current={stockLevelBand(level)}
                />
              </li>
            ))}
          </ul>
        )}

        {availableItems.length > 0 ? (
          <form
            action={addPropertyStockLevel.bind(null, property.id)}
            className={card("flex flex-wrap items-end gap-3 p-4")}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stockItemId" className="text-sm font-medium">
                Item
              </label>
              <select id="stockItemId" name="stockItemId" required className={inputCompact}>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="parQty" className="text-sm font-medium">
                Par level
              </label>
              <input
                id="parQty"
                name="parQty"
                type="number"
                min={1}
                required
                placeholder="e.g. 6"
                className={`${inputCompact} w-24`}
              />
            </div>
            <button type="submit" className={button("primary", "sm")}>
              Add
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-500">
            {property.stockLevels.length === 0 ? (
              <>
                No stock items exist yet —{" "}
                <a href="/admin/stock-items/new" className="underline underline-offset-2">
                  create one
                </a>
                .
              </>
            ) : (
              "Every active item is already configured on this property."
            )}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Billing
          <InfoTooltip text="Optional floor on billed hours per visit, so a cleaner who finishes quickly because the property was left in good condition isn't penalised for it — invoices bill whichever is higher, actual time or this minimum. Leave blank to bill actual time only." />
        </h2>
        {property.minBillableHours !== null ? (
          <div className={card("flex flex-col gap-3 p-4")}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Minimum hours per visit</p>
              <p className="text-lg font-semibold">{property.minBillableHours}h</p>
            </div>

            {/* Once a minimum is set it's a settled business fact, not
                something to accidentally overwrite while glancing at this
                page -- same "tucked behind a disclosure" treatment as par
                settings above. */}
            <details className="border-t border-black/5 pt-3">
              <summary className="cursor-pointer text-xs text-zinc-500">Edit</summary>
              <form
                action={updatePropertyMinBillableHours.bind(null, property.id)}
                className="mt-3 flex flex-wrap items-end gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label htmlFor="minBillableHours" className="text-xs text-zinc-500">
                    Minimum hours per visit
                  </label>
                  <input
                    id="minBillableHours"
                    name="minBillableHours"
                    type="number"
                    min={0}
                    step="0.25"
                    defaultValue={property.minBillableHours}
                    placeholder="e.g. 2"
                    className={`${inputCompact} w-28`}
                  />
                </div>
                <button type="submit" className={button("secondary", "sm")}>
                  Save
                </button>
                <p className="w-full text-xs text-zinc-500">Clear the field and save to turn it off.</p>
              </form>
            </details>
          </div>
        ) : (
          <form
            action={updatePropertyMinBillableHours.bind(null, property.id)}
            className={card("flex flex-wrap items-end gap-3 p-4")}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="minBillableHours" className="text-sm font-medium">
                Minimum hours per visit
              </label>
              <input
                id="minBillableHours"
                name="minBillableHours"
                type="number"
                min={0}
                step="0.25"
                placeholder="e.g. 2"
                className={`${inputCompact} w-28`}
              />
            </div>
            <button type="submit" className={button("secondary", "sm")}>
              Save
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Cleaning costs <span className="text-sm font-normal text-zinc-500">({property.invoices.length})</span>
          <InfoTooltip text="Every invoice generated for this property, one per cleaner per billing period — this client's cleaning spend, on its own, separate from every other property." />
        </h2>

        {property.invoices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {property.invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className={card("flex items-center justify-between gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{inv.cleaner.name}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {formatPeriod(inv.periodStart, inv.periodEnd)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      {formatHours(inv.totalHours)} · {formatCurrency(inv.totalAmount)}
                    </span>
                    <span className={badge(inv.paidAt ? "solid" : "neutral")}>
                      {inv.paidAt ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            No invoices generated yet — see{" "}
            <Link href={`/admin/invoices?propertyId=${property.id}`} className="underline underline-offset-2">
              Invoices
            </Link>
            .
          </p>
        )}
      </section>

      {/* Fully hidden once Hostify is linked and there's nothing left to
          clean up -- Hostify already aggregates every channel, so running
          both at once only risks a duplicate clean for the same booking.
          Stays visible (trimmed to just the warning + feed list + Remove,
          no add-form, no horizon control -- that's moved to Hostify below)
          as long as old feeds are still actually there, so staff have
          somewhere to go clear the conflict rather than it silently
          vanishing while still synced in the background. */}
      {(!hasHostifyListing || property.calendarFeeds.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Calendars <span className="text-sm font-normal text-zinc-500">({property.calendarFeeds.length})</span>
            <InfoTooltip text="Airbnb, Vrbo, and Booking.com each publish their own iCal link for a listing — add one row per platform. Sync now pulls in new bookings as scheduled cleans and cancels any whose booking has disappeared, as long as that clean hasn't started yet." />
          </h2>

          {!hasHostifyListing && syncHorizonControl}

          {hasHostifyListing && property.calendarFeeds.length > 0 && (
            <p className="text-xs font-medium text-zinc-600">
              This property syncs via Hostify now — these calendar feeds are still active too and
              could create a duplicate clean for the same booking. Remove them below.
            </p>
          )}

          {property.calendarFeeds.length > 0 && (
            <ul className="flex flex-col gap-2">
              {property.calendarFeeds.map((feed) => (
                <li key={feed.id} className={card("flex flex-col gap-2 p-4")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{feed.label}</p>
                      <p className="truncate text-sm text-zinc-500">
                        {feed.lastSyncError
                          ? `Last sync failed: ${feed.lastSyncError}`
                          : feed.lastSyncedAt
                            ? `Synced ${formatScheduledFor(feed.lastSyncedAt)}`
                            : "Never synced"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <form action={syncPropertyCalendarFeed.bind(null, property.id, feed.id)}>
                        <button type="submit" className={button("secondary", "sm")}>
                          Sync now
                        </button>
                      </form>
                      <form action={removePropertyCalendarFeed.bind(null, property.id, feed.id)}>
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Adding a new iCal feed alongside an active Hostify listing is
              exactly the double-sync risk warned about above -- once
              Hostify is connected, this form is the one part of Calendars
              that's fully hidden, not just discouraged. */}
          {!hasHostifyListing && (
            <form
              action={addPropertyCalendarFeed.bind(null, property.id)}
              className={card("flex flex-wrap items-end gap-3 p-4")}
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="label" className="text-sm font-medium">
                  Platform
                </label>
                <input
                  id="label"
                  name="label"
                  type="text"
                  required
                  placeholder="e.g. Airbnb"
                  className={`${inputCompact} w-32`}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="url" className="text-sm font-medium">
                  Calendar URL
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  required
                  placeholder="https://www.airbnb.co.uk/calendar/ical/....ics"
                  className={`${inputCompact} w-full`}
                />
              </div>
              <button type="submit" className={button("primary", "sm")}>
                Add
              </button>
            </form>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Hostify
          <InfoTooltip text="A Hostify listing already aggregates every channel (Airbnb, Vrbo, ...) into one reservation feed, so this is one listing per property rather than the several feeds Calendars needs. Syncing also runs automatically in the background every so often, not just on click." />
        </h2>

        {hasHostifyListing && syncHorizonControl}

        {!property.client.hostifyApiKey ? (
          <p className={card("p-4 text-sm text-zinc-500")}>
            No Hostify API key configured on{" "}
            <Link
              href={`/admin/clients/${property.client.id}/edit`}
              className="underline underline-offset-2"
            >
              {property.client.name}
            </Link>{" "}
            yet.
          </p>
        ) : property.hostifyListingId === null ? (
          <form
            action={updatePropertyHostifyListingId.bind(null, property.id)}
            className={card("flex flex-wrap items-end gap-3 p-4")}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hostifyListingId" className="text-sm font-medium">
                Hostify listing ID
              </label>
              {/* text, not number -- real Hostify listing ids run well past
                  what a number input reliably handles at that many digits,
                  and this is an opaque id, never arithmetic. inputMode still
                  gets a numeric keyboard on mobile. */}
              <input
                id="hostifyListingId"
                name="hostifyListingId"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="e.g. 12345"
                className={`${inputCompact} w-40`}
              />
            </div>
            <button type="submit" className={button("primary", "sm")}>
              Link
            </button>
          </form>
        ) : (
          <div className={card("flex flex-col gap-2 p-4")}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">Listing #{property.hostifyListingId}</p>
                <p className="text-sm text-zinc-500">
                  {property.hostifyLastSyncError
                    ? `Last sync failed: ${property.hostifyLastSyncError}`
                    : property.hostifyLastSyncedAt
                      ? `Synced ${formatScheduledFor(property.hostifyLastSyncedAt)}`
                      : "Never synced"}
                </p>
                {property.hostifyLastSyncError && (
                  <Link
                    href={`/admin/clients/${property.client.id}/edit`}
                    className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                  >
                    Check the Hostify API key on {property.client.name}
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <form action={syncPropertyHostifyListing.bind(null, property.id)}>
                  <button type="submit" className={button("secondary", "sm")}>
                    Sync now
                  </button>
                </form>
                <form action={removePropertyHostifyListing.bind(null, property.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>

      {laundryOut.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Out for laundry{" "}
            <span className="text-sm font-normal text-zinc-500">({laundryOut.length})</span>
            <InfoTooltip text="Linen from this property that's out with the laundry company. Mark it returned once it's back — it then drops off this list on its own, so this only ever shows what's actually still out." />
          </h2>
          <ul className="flex flex-col gap-2">
            {laundryOut.map((load) => {
              const otherProperties = [
                ...new Set(
                  load.logs
                    .map((l) => l.clean.property)
                    .filter((p) => p.id !== property.id)
                    .map((p) => propertyDisplayName(p)),
                ),
              ];
              return (
                <li key={load.id} className={card("flex items-center gap-4 p-4")}>
                  <Link href={`/admin/laundry/${load.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    {load.receiptPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/laundry-photos/${load.receiptPath}`}
                        alt="Laundry ticket"
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">
                        {load.cost !== null ? `${formatCurrency(load.cost)} · ` : ""}
                        {load.facility.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {formatDate(load.createdAt)} · logged by {load.recordedBy.name}
                        {otherProperties.length > 0 && ` · also covers ${otherProperties.join(", ")}`}
                      </p>
                    </div>
                  </Link>
                  <form action={setLaundryLoadCollected.bind(null, load.id, property.id, true)}>
                    <button type="submit" className={button("secondary", "sm")}>
                      Mark as returned
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Photos <span className="text-sm font-normal text-zinc-500">({property.images.length})</span>
          </h2>
          {hasHostifyListing && (
            <FetchCoverPhotoButton action={fetchPropertyCoverPhoto.bind(null, property.id)} />
          )}
        </div>

        {property.images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {property.images.map((img) => (
              <li key={img.id} className={card("overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${img.path}`}
                  alt={propertyDisplayName(property)}
                  className="h-32 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-2">
                  {img.isPrimary ? (
                    <span className={badge("solid")}>Cover</span>
                  ) : (
                    <form action={setPrimaryPhoto.bind(null, property.id, img.id)}>
                      <button type="submit" className={button("ghost", "sm")}>
                        Make cover
                      </button>
                    </form>
                  )}
                  <form action={deletePropertyPhoto.bind(null, property.id, img.id)}>
                    <button type="submit" className={button("ghost", "sm")} aria-label="Delete photo">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addPropertyPhotos.bind(null, property.id)}
          className={card("flex max-w-lg flex-col gap-3 p-4")}
        >
          <label htmlFor="photos" className="text-sm font-medium">
            Add photos
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            required
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <div>
            <button type="submit" className={button("primary", "sm")}>
              Upload
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
