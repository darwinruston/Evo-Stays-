import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { card } from "@/lib/ui";

export const metadata = { title: "Overview" };

export default async function AdminHomePage() {
  const session = await requireStaff();

  const [clients, properties, upcoming, requests] = await Promise.all([
    prisma.client.count(),
    prisma.property.count(),
    prisma.clean.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    // Client-requested cleans still waiting for a slot -- the one number here
    // that means someone is waiting on us.
    prisma.clean.count({ where: { requestedByClientId: { not: null }, scheduledFor: null } }),
  ]);

  const tiles = [
    { href: "/admin/clients", label: "Clients", value: clients },
    { href: "/admin/properties", label: "Properties", value: properties },
    { href: "/admin/cleans", label: "Cleans outstanding", value: upcoming },
    { href: "/admin/cleans", label: "Unscheduled requests", value: requests },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.name} · {session.user.role}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={card("p-5 transition-colors hover:bg-black/[0.02]")}>
            <p className="text-sm text-zinc-500">{t.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className={card("p-6")}>
        <p className="text-sm text-zinc-600">
          The stock catalogue lands here in the next phase.
        </p>
      </div>
    </div>
  );
}
