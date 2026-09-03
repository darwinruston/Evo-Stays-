import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { propertyDisplayName } from "@/lib/address";
import { button, card, inputCompact } from "@/lib/ui";
import { createClientLogin, deleteClientLogin } from "../actions";

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
      users: { orderBy: { createdAt: "asc" } },
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Portal access</h2>
        <p className="text-sm text-zinc-600">
          Logins that can sign in and see this client&apos;s portfolio — and nothing else.
        </p>

        {client.users.length > 0 && (
          <ul className="flex flex-col gap-2">
            {client.users.map((u) => (
              <li key={u.id} className={card("flex items-center justify-between p-4")}>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-zinc-500">{u.email}</p>
                </div>
                <form action={deleteClientLogin.bind(null, client.id, u.id)}>
                  <button type="submit" className={button("danger", "sm")}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createClientLogin.bind(null, client.id)}
          className={card("flex max-w-lg flex-col gap-3 p-4")}
        >
          <p className="text-sm font-medium">Add a login</p>
          <input name="loginName" required placeholder="Contact name" className={inputCompact} />
          <input
            name="loginEmail"
            type="email"
            required
            placeholder="Email address"
            className={inputCompact}
          />
          <input
            name="loginPassword"
            type="password"
            required
            minLength={8}
            placeholder="Initial password (min 8 characters)"
            className={inputCompact}
          />
          <div>
            <button type="submit" className={button("primary", "sm")}>
              Create login
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
