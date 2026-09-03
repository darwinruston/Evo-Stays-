import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { button, card } from "@/lib/ui";

export const metadata = { title: "Cleaners" };

function weekWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export default async function CleanersPage() {
  await requireStaff();
  const { start, end } = weekWindow();

  const [cleaners, thisWeekByCleaner] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLEANER" },
      orderBy: { name: "asc" },
      include: { _count: { select: { assignedCleans: true } } },
    }),
    // One grouped query rather than one count per cleaner -- this page's
    // whole point is comparing workload at a glance, so it reads as one
    // list, not N round trips.
    prisma.clean.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { not: null },
        scheduledFor: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
      _count: { _all: true },
    }),
  ]);

  const thisWeekCounts = new Map(
    thisWeekByCleaner.map((g) => [g.assignedToId as string, g._count._all]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cleaners</h1>
        <Link href="/admin/cleaners/new" className={button("primary", "sm")}>
          New cleaner
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        A cleaner sees only the properties they&apos;re assigned a clean at — access notes carry
        key safe codes, so the estate isn&apos;t browsable.
      </p>

      {cleaners.length === 0 ? (
        <p className="text-sm text-zinc-600">No cleaners yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cleaners.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/cleaners/${c.id}`}
                className={card("flex items-center gap-4 p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <Avatar name={c.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="truncate text-sm text-zinc-500">{c.email}</p>
                </div>
                <div className="shrink-0 text-right text-sm text-zinc-500">
                  <p>
                    {thisWeekCounts.get(c.id) ?? 0}{" "}
                    {(thisWeekCounts.get(c.id) ?? 0) === 1 ? "clean" : "cleans"} this week
                  </p>
                  <p className="text-xs text-zinc-400">
                    {c._count.assignedCleans} total
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
