import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { Avatar } from "@/components/Avatar";
import { deleteCleaner } from "./actions";
import { button, card } from "@/lib/ui";

export const metadata = { title: "Cleaners" };

export default async function CleanersPage() {
  await requireStaff();

  const cleaners = await prisma.user.findMany({
    where: { role: "CLEANER" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignedCleans: true } },
    },
  });

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
            <li key={c.id} className={card("flex items-center gap-4 p-4")}>
              <Avatar name={c.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="truncate text-sm text-zinc-500">{c.email}</p>
              </div>
              <span className="shrink-0 text-sm text-zinc-500">
                {c._count.assignedCleans} {c._count.assignedCleans === 1 ? "clean" : "cleans"}
              </span>
              <form action={deleteCleaner.bind(null, c.id)} className="shrink-0">
                <button type="submit" className={button("danger", "sm")}>
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
