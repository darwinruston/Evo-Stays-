import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { CleanForm } from "../CleanForm";
import { createClean } from "../actions";

export const metadata = { title: "Schedule a clean" };

export default async function NewCleanPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  await requireStaff();
  const { propertyId } = await searchParams;

  const [properties, cleaners] = await Promise.all([
    prisma.property.findMany({
      orderBy: [{ client: { name: "asc" } }, { createdAt: "asc" }],
      select: { id: true, name: true, address: true, client: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: "CLEANER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/cleans" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleans
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Schedule a clean</h1>
      </div>

      {properties.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Add a{" "}
          <Link href="/admin/properties/new" className="underline underline-offset-2">
            property
          </Link>{" "}
          first.
        </p>
      ) : (
        <CleanForm
          action={createClean}
          properties={properties}
          cleaners={cleaners}
          defaultPropertyId={propertyId}
          submitLabel="Schedule clean"
        />
      )}
    </div>
  );
}
