import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { getPmsAdapter } from "@/lib/pms/registry";
import { decryptPmsCredentials } from "@/lib/pms/credentials";
import type { PmsListing } from "@/lib/pms/types";
import { importPmsListings } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { card } from "@/lib/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireStaff();
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, select: { pmsProvider: true } });
  const displayName = client?.pmsProvider ? getPmsAdapter(client.pmsProvider).displayName : "PMS";
  return { title: `Import from ${displayName}` };
}

export default async function ImportPmsListingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireStaff();
  const { id } = await params;

  const client = await db.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      pmsProvider: true,
      pmsCredentials: true,
      properties: { select: { pmsListingId: true } },
    },
  });
  if (!client || !client.pmsProvider || !client.pmsCredentials) notFound();

  const adapter = getPmsAdapter(client.pmsProvider);
  const importedIds = new Set(
    client.properties.map((p) => p.pmsListingId).filter((v): v is string => v !== null),
  );

  let listings: PmsListing[] = [];
  let error: string | null = null;
  try {
    const credentials = decryptPmsCredentials(client.pmsCredentials);
    listings = await adapter.listListings(credentials);
  } catch (err) {
    error = err instanceof Error ? err.message : `Couldn't reach ${adapter.displayName}`;
  }

  const notImported = listings.filter((l) => !importedIds.has(l.externalId));
  const alreadyImported = listings.filter((l) => importedIds.has(l.externalId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {client.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import from {adapter.displayName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pulls this client&apos;s listings straight from {adapter.displayName} — address, bed/bath
          counts, and the listing ID all filled in automatically, and each imported property starts
          syncing reservations into cleans right away.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-zinc-600">Couldn&apos;t reach {adapter.displayName}: {error}</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-zinc-600">No listings found on this {adapter.displayName} account.</p>
      ) : notImported.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Every listing on this {adapter.displayName} account is already imported.
        </p>
      ) : (
        <form action={importPmsListings.bind(null, client.id)} className="flex flex-col gap-4">
          <input type="hidden" name="listingsJson" value={JSON.stringify(notImported)} />
          <ul className="flex flex-col gap-2">
            {notImported.map((listing) => (
              <li key={listing.externalId} className={card("flex items-start gap-3 p-4")}>
                <input
                  type="checkbox"
                  name="selectedIds"
                  value={listing.externalId}
                  id={`listing-${listing.externalId}`}
                  className="mt-1"
                />
                <label htmlFor={`listing-${listing.externalId}`} className="flex-1 cursor-pointer">
                  <p className="font-medium">{listing.name}</p>
                  <p className="text-sm text-zinc-500">{listing.address}</p>
                  <p className="text-xs text-zinc-500">
                    {listing.bedrooms ?? "?"} bed · {listing.bathrooms ?? "?"} bath · sleeps{" "}
                    {listing.maxOccupancy ?? "?"}
                  </p>
                </label>
              </li>
            ))}
          </ul>
          <div>
            <SubmitButton pendingLabel="Importing…">Import selected</SubmitButton>
          </div>
          <p className="text-xs text-zinc-500">
            Each property pulls its details, cover photo, and reservations from {adapter.displayName} in
            turn — this can take a while for more than a couple of properties.
          </p>
        </form>
      )}

      {alreadyImported.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-black/5 pt-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Already imported ({alreadyImported.length})
          </h2>
          <ul className="flex flex-col gap-1">
            {alreadyImported.map((listing) => (
              <li key={listing.externalId} className="text-sm text-zinc-500">
                {listing.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
