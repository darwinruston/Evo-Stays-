import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { PropertyCover } from "@/components/PropertyCover";
import { card } from "@/lib/ui";

export const metadata = { title: "My portfolio" };

export default async function ClientPortfolioPage() {
  const { clientId } = await requireClientAccount();

  if (!clientId) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">My portfolio</h1>
        <p className="text-sm text-zinc-600">
          This login isn&apos;t linked to a portfolio yet. Get in touch with the Evo team and
          they&apos;ll connect it.
        </p>
      </div>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      properties: {
        orderBy: { createdAt: "asc" },
        include: { images: { where: { isPrimary: true }, take: 1, select: { path: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My portfolio</h1>
        <p className="mt-1 text-sm text-zinc-500">{client?.name}</p>
      </div>

      {!client || client.properties.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No properties on your account yet — the Evo team adds these for you.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {client.properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/client/properties/${p.id}`}
                className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <PropertyCover path={p.images[0]?.path} alt={propertyDisplayName(p)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{propertyDisplayName(p)}</p>
                  <p className="truncate text-sm text-zinc-500">{p.address}</p>
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
