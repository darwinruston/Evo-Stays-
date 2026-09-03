import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { badge, button, card } from "@/lib/ui";

export const metadata = { title: "Stock items" };

export default async function StockItemsPage() {
  await requireStaff();

  const items = await prisma.stockItem.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { levels: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Stock items</h1>
        <Link href="/admin/stock-items/new" className={button("primary", "sm")}>
          New item
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        The catalogue every property&apos;s par levels are picked from.{" "}
        <Link href="/admin/stock" className="underline underline-offset-2">
          See what&apos;s running low →
        </Link>
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">No stock items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/stock-items/${item.id}/edit`}
                className={card("flex items-center justify-between p-4 transition-colors hover:bg-black/[0.02]")}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-zinc-500">
                    {item.unit ?? "no unit set"} · configured on {item._count.levels}{" "}
                    {item._count.levels === 1 ? "property" : "properties"}
                  </p>
                </div>
                {!item.active && <span className={badge("outline")}>Inactive</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
