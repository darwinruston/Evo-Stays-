import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { ClientForm } from "../ClientForm";
import { createClient } from "../actions";

export const metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New client</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add the host first; properties and their portal login come next, from the client&apos;s
          own page.
        </p>
      </div>

      <ClientForm action={createClient} submitLabel="Create client" />
    </div>
  );
}
