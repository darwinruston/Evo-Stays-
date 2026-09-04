import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StockLevelIndicator } from "@/components/StockLevelIndicator";
import { StockLevelToggle } from "@/components/StockLevelToggle";
import { stockLevelBand } from "@/lib/stock";
import { formatCurrency, formatHours, formatPeriod } from "@/lib/invoices";
import { toIsoDate } from "@/lib/schedule";
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
} from "../actions";
import { setLaundryLoadCollected } from "../../laundry/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      client: { select: { id: true, name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      stockLevels: { orderBy: { createdAt: "asc" }, include: { stockItem: true } },
      invoices: {
        orderBy: { periodStart: "desc" },
        include: { cleaner: { select: { id: true, name: true } } },
      },
    },
  });
  if (!property) notFound();

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
      recordedBy: { select: { name: true } },
      logs: { include: { clean: { include: { property: { select: { id: true, name: true, address: true } } } } } },
    },
  });

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
          <Link href={`/admin/properties/${property.id}/edit`} className={button("secondary", "sm")}>
            Edit
          </Link>
        </div>
      </div>

      <PropertyDetails property={property} />

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
            <Link href="/admin/invoices" className="underline underline-offset-2">
              Invoices
            </Link>
            .
          </p>
        )}
      </section>

      {laundryOut.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            At the launderette{" "}
            <span className="text-sm font-normal text-zinc-500">({laundryOut.length})</span>
            <InfoTooltip text="Linen from this property that's out being cleaned. Mark it collected once it's back -- it then drops off this list on its own, so this only ever shows what's actually still out." />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/laundry-photos/${load.receiptPath}`}
                      alt="Laundry ticket"
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{formatCurrency(load.cost)}</p>
                      <p className="truncate text-sm text-zinc-500">
                        {toIsoDate(load.createdAt)} · logged by {load.recordedBy.name}
                        {otherProperties.length > 0 && ` · also covers ${otherProperties.join(", ")}`}
                      </p>
                    </div>
                  </Link>
                  <form action={setLaundryLoadCollected.bind(null, load.id, property.id, true)}>
                    <button type="submit" className={button("secondary", "sm")}>
                      Mark as collected
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Photos <span className="text-sm font-normal text-zinc-500">({property.images.length})</span>
        </h2>

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
