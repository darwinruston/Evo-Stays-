import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { ClientForm } from "../../ClientForm";
import { updateClient, deleteClient } from "../../actions";
import { button } from "@/lib/ui";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { properties: true } } },
  });
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/admin/clients/${client.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {client.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit client</h1>
      </div>

      <ClientForm action={updateClient.bind(null, client.id)} client={client} submitLabel="Save changes" />

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        <p className="text-sm text-zinc-600">
          Removes this client along with their {client._count.properties}{" "}
          {client._count.properties === 1 ? "property" : "properties"} and all property photos.
          This cannot be undone.
        </p>
        <form action={deleteClient.bind(null, client.id)}>
          <button type="submit" className={button("danger", "sm")}>
            Delete client
          </button>
        </form>
      </section>
    </div>
  );
}
