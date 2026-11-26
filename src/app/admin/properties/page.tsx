import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyCover } from "@/components/PropertyCover";
import { button, card, inputCompact } from "@/lib/ui";
import { KEY_AMENITIES, hasAmenity } from "@/lib/amenities";

export const metadata = { title: "Properties" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ has?: string }> }) {
  const { db } = await requireStaff();
  const { has } = await searchParams;
  const wanted = KEY_AMENITIES.find((a) => a.id === has);

  const all = await db.property.findMany({
    orderBy: [{ client: { name: "asc" } }, { createdAt: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      images: { where: { isPrimary: true }, take: 1, select: { path: true } },
    },
  });
  const properties = wanted ? all.filter((p) => hasAmenity(p, wanted)) : all;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Link href="/admin/properties/new" className={button("primary", "sm")}>
          New property
        </Link>
      </div>

      {all.length > 0 && (
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="has" className="text-xs text-zinc-500">
              Has
            </label>
            <select id="has" name="has" defaultValue={wanted?.id ?? ""} key={wanted?.id ?? "any"} className={inputCompact}>
              <option value="">Anything</option>
              {KEY_AMENITIES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={button("secondary", "sm")}>
            Find
          </button>
          {wanted && (
            <>
              <Link href="/admin/properties" className={button("ghost", "sm")}>
                Clear
              </Link>
              <span className="text-sm text-zinc-500">
                {properties.length} of {all.length}
              </span>
            </>
          )}
        </form>
      )}

      {properties.length === 0 ? (
        <p className="text-sm text-zinc-600">{wanted ? "No property is recorded as having that." : "No properties yet."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/properties/${p.id}`}
                className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <PropertyCover path={p.images[0]?.path} alt={propertyDisplayName(p)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{propertyDisplayName(p)}</p>
                  <p className="truncate text-sm text-zinc-500">{p.client.name}</p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500">
                  {p.bedrooms ?? "?"} bed · sleeps {p.maxOccupancy ?? "?"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
