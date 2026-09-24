import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { IssueForm } from "@/components/IssueForm";
import { button, card } from "@/lib/ui";
import { createIssue } from "../actions";

export const metadata = { title: "Log an issue" };

export default async function NewIssuePage({
  searchParams,
}: {
  // Pre-selects the property when reached from a property's own page.
  searchParams: Promise<{ propertyId?: string }>;
}) {
  await requireStaff();
  const { propertyId } = await searchParams;

  const properties = await prisma.property.findMany({
    orderBy: [{ client: { name: "asc" } }, { createdAt: "asc" }],
    select: { id: true, name: true, address: true, client: { select: { name: true } } },
  });

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href={propertyId ? `/admin/issues?propertyId=${propertyId}` : "/admin/issues"}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Issues
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Log an issue</h1>
        <p className="mt-1 text-sm text-zinc-500">
          For a problem reported some other way — a guest complaint, an inspection. Cleaners report
          their own from the clean they&apos;re on.
        </p>
      </div>

      <div className={card("p-5")}>
        <IssueForm
          action={createIssue}
          submitLabel="Log issue"
          submitClassName={`w-fit ${button("primary", "md")}`}
          properties={properties.map((p) => ({ id: p.id, label: `${p.client.name} — ${propertyDisplayName(p)}` }))}
          defaultPropertyId={propertyId}
        />
      </div>
    </div>
  );
}
