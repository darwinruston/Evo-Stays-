import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { fetchHostifyListings, buildHostifyAddress, type HostifyListing } from "@/lib/hostifyListings";
import { importHostifyListings } from "../../actions";
import { button, card } from "@/lib/ui";

export const metadata = { title: "Import from Hostify" };

export default async function ImportHostifyListingsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      hostifyApiKey: true,
      properties: { select: { hostifyListingId: true } },
    },
  });
  if (!client || !client.hostifyApiKey) notFound();

  const importedIds = new Set(
    client.properties.map((p) => p.hostifyListingId).filter((v): v is string => v !== null),
  );

  let listings: HostifyListing[] = [];
  let error: string | null = null;
  try {
    listings = await fetchHostifyListings(client.hostifyApiKey);
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hostify";
  }

  const notImported = listings.filter((l) => !importedIds.has(String(l.id)));
  const alreadyImported = listings.filter((l) => importedIds.has(String(l.id)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {client.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import from Hostify</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pulls this client&apos;s listings straight from Hostify — address, bed/bath counts, and the
          listing ID all filled in automatically, and each imported property starts syncing
          reservations into cleans right away.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-zinc-600">Couldn&apos;t reach Hostify: {error}</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-zinc-600">No listings found on this Hostify account.</p>
      ) : notImported.length === 0 ? (
        <p className="text-sm text-zinc-600">Every listing on this Hostify account is already imported.</p>
      ) : (
        <form action={importHostifyListings.bind(null, client.id)} className="flex flex-col gap-4">
          <input type="hidden" name="listingsJson" value={JSON.stringify(notImported)} />
          <ul className="flex flex-col gap-2">
            {notImported.map((listing) => (
              <li key={listing.id} className={card("flex items-start gap-3 p-4")}>
                <input
                  type="checkbox"
                  name="selectedIds"
                  value={listing.id}
                  id={`listing-${listing.id}`}
                  className="mt-1"
                />
                <label htmlFor={`listing-${listing.id}`} className="flex-1 cursor-pointer">
                  <p className="font-medium">{listing.name}</p>
                  <p className="text-sm text-zinc-500">{buildHostifyAddress(listing)}</p>
                  <p className="text-xs text-zinc-500">
                    {listing.bedrooms ?? "?"} bed · {listing.bathrooms ?? "?"} bath · sleeps{" "}
                    {listing.person_capacity ?? "?"}
                  </p>
                </label>
              </li>
            ))}
          </ul>
          <div>
            <button type="submit" className={button("primary", "sm")}>
              Import selected
            </button>
          </div>
        </form>
      )}

      {alreadyImported.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-black/5 pt-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Already imported ({alreadyImported.length})
          </h2>
          <ul className="flex flex-col gap-1">
            {alreadyImported.map((listing) => (
              <li key={listing.id} className="text-sm text-zinc-500">
                {listing.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
