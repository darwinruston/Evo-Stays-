import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyDetails } from "@/components/PropertyDetails";
import { StockLevelIndicator } from "@/components/StockLevelIndicator";
import { StockLevelToggle } from "@/components/StockLevelToggle";
import { stockLevelBand } from "@/lib/stock";
import { badge, button, card, inputCompact } from "@/lib/ui";
import {
  addPropertyPhotos,
  setPrimaryPhoto,
  deletePropertyPhoto,
  addPropertyStockLevel,
  updatePropertyStockPar,
  setPropertyStockLevel,
  removePropertyStockLevel,
} from "../actions";

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
    },
  });
  if (!property) notFound();

  const configuredItemIds = new Set(property.stockLevels.map((l) => l.stockItemId));
  const availableItems = await prisma.stockItem.findMany({
    where: { active: true, id: { notIn: [...configuredItemIds] } },
    orderBy: { name: "asc" },
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
        <h2 className="text-sm font-medium text-zinc-500">Photos ({property.images.length})</h2>

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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          Stock ({property.stockLevels.length})
        </h2>
        <p className="text-sm text-zinc-600">
          Nobody counts bin bags exactly, before or after topping them up — set the level the same
          way a cleaner records it. Par is the one real number here: what a full restock brings
          this property up to, e.g. a pack or order size (6 hand soaps, 50 bin bags), not the bare
          minimum needed.
        </p>

        {property.stockLevels.length > 0 && (
          <ul className="flex flex-col gap-2">
            {property.stockLevels.map((level) => (
              <li key={level.id} className={card("flex flex-col gap-3 p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{level.stockItem.name}</p>
                    <p className="text-xs text-zinc-500">
                      Par {level.parQty}
                      {level.stockItem.unit ? ` ${level.stockItem.unit}` : ""}
                    </p>
                  </div>
                  <StockLevelIndicator level={level} />
                </div>

                <StockLevelToggle
                  action={setPropertyStockLevel.bind(null, property.id, level.id)}
                  current={stockLevelBand(level)}
                />

                {/* Par is a one-time setup fact (a pack or order size), not
                    something that needs adjusting on every visit to this
                    page -- tucked away by default so the level toggle above
                    is what actually draws the eye. */}
                <details className="border-t border-black/5 pt-3">
                  <summary className="cursor-pointer text-xs text-zinc-500">
                    Par settings
                  </summary>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <form
                      action={updatePropertyStockPar.bind(null, property.id, level.id)}
                      className="flex items-end gap-2"
                    >
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-500">Par</label>
                        <input
                          name="parQty"
                          type="number"
                          min={1}
                          defaultValue={level.parQty}
                          className={`${inputCompact} w-20`}
                        />
                      </div>
                      <button type="submit" className={button("secondary", "sm")}>
                        Save
                      </button>
                    </form>
                    <form action={removePropertyStockLevel.bind(null, property.id, level.id)}>
                      <button type="submit" className={button("danger", "sm")}>
                        Remove from this property
                      </button>
                    </form>
                  </div>
                </details>
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
    </div>
  );
}
