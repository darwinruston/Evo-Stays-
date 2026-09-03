import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { propertyDisplayName } from "@/lib/address";
import { button, card } from "@/lib/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  return { title: client?.name ?? "Client" };
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Clients
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <Avatar name={client.name} photoPath={client.photoPath} size={56} />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {client.email ?? "No email"}
              {client.phone ? ` · ${client.phone}` : ""}
            </p>
          </div>
          <Link href={`/admin/clients/${client.id}/edit`} className={button("secondary", "sm")}>
            Edit
          </Link>
        </div>
        {client.notes && <p className="mt-4 text-sm text-zinc-600">{client.notes}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">
            Portfolio ({client.properties.length})
          </h2>
          <Link
            href={`/admin/properties/new?clientId=${client.id}`}
            className={button("secondary", "sm")}
          >
            Add property
          </Link>
        </div>
        {client.properties.length === 0 ? (
          <p className="text-sm text-zinc-600">No properties yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.properties.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/properties/${p.id}`}
                  className={card("flex items-center justify-between p-4 transition-colors hover:bg-black/[0.02]")}
                >
                  <span className="font-medium">{propertyDisplayName(p)}</span>
                  <span className="text-sm text-zinc-500">
                    {p.bedrooms ?? "?"} bed · sleeps {p.maxOccupancy ?? "?"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
