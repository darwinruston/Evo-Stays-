import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { button, card } from "@/lib/ui";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requireStaff();

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { properties: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Link href="/admin/clients/new" className={button("primary", "sm")}>
          New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-zinc-600">No clients yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <Avatar name={c.name} photoPath={c.photoPath} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="truncate text-sm text-zinc-500">
                    {c.email ?? "No email"}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500">
                  {c._count.properties} {c._count.properties === 1 ? "property" : "properties"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
