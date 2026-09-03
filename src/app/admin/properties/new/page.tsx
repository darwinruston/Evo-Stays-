import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { PropertyForm } from "../PropertyForm";
import { createProperty } from "../actions";

export const metadata = { title: "New property" };

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireStaff();
  // Preselected when arriving from a client's own page ("Add property").
  const { clientId } = await searchParams;

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/properties" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Properties
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New property</h1>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Add a{" "}
          <Link href="/admin/clients/new" className="underline underline-offset-2">
            client
          </Link>{" "}
          first — every property belongs to one.
        </p>
      ) : (
        <PropertyForm
          action={createProperty}
          clients={clients}
          defaultClientId={clientId}
          submitLabel="Create property"
          showPhotos
        />
      )}
    </div>
  );
}
