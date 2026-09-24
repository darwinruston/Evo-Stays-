import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { sortIssuesByUrgency } from "@/lib/issues";
import { IssueList, toIssueRow } from "@/components/IssueList";
import { button } from "@/lib/ui";

export const metadata = { title: "Issues" };

// "Open" means anything still needing attention -- OPEN and IN_PROGRESS
// together -- since from the list's point of view both are unfinished
// work. It's the default view: resolved issues are history.
const VIEWS = {
  open: { label: "Open", where: { status: { not: "RESOLVED" } } },
  resolved: { label: "Resolved", where: { status: "RESOLVED" } },
  all: { label: "All", where: {} },
} satisfies Record<string, { label: string; where: Prisma.IssueWhereInput }>;
type View = keyof typeof VIEWS;

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; propertyId?: string }>;
}) {
  await requireStaff();
  const { view: rawView, propertyId } = await searchParams;
  // Own keys only, so ?view=toString falls back to "open" rather than
  // matching an inherited property.
  const view: View = rawView && Object.hasOwn(VIEWS, rawView) ? (rawView as View) : "open";

  const [issues, property] = await Promise.all([
    prisma.issue.findMany({
      where: { ...VIEWS[view].where, ...(propertyId ? { propertyId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { name: true, address: true } },
        reportedBy: { select: { name: true } },
        _count: { select: { photos: true } },
      },
    }),
    propertyId
      ? prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, name: true, address: true } })
      : null,
  ]);

  // A property filter that doesn't resolve would otherwise just read as
  // "Nothing open" -- misleadingly reassuring for what's really a bad link.
  if (propertyId && !property) notFound();

  // Open work reads most-urgent first; history reads newest first.
  const ordered = view === "resolved" ? issues : sortIssuesByUrgency(issues);

  const hrefFor = (v: View) => {
    const params = new URLSearchParams();
    if (v !== "open") params.set("view", v);
    if (propertyId) params.set("propertyId", propertyId);
    const q = params.toString();
    return `/admin/issues${q ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
          {property && (
            <p className="mt-1 text-sm text-zinc-500">
              At{" "}
              <Link href={`/admin/properties/${property.id}`} className="hover:text-zinc-900 hover:underline">
                {propertyDisplayName(property)}
              </Link>{" "}
              ·{" "}
              <Link
                href={view === "open" ? "/admin/issues" : `/admin/issues?view=${view}`}
                className="underline underline-offset-2 hover:text-zinc-900"
              >
                show every property
              </Link>
            </p>
          )}
        </div>
        <Link
          href={`/admin/issues/new${propertyId ? `?propertyId=${propertyId}` : ""}`}
          className={button("primary", "sm")}
        >
          Log an issue
        </Link>
      </div>

      <nav className="flex gap-1" aria-label="Filter issues">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link
            key={v}
            href={hrefFor(v)}
            aria-current={v === view ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              v === view ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-black/5 hover:text-zinc-950"
            }`}
          >
            {VIEWS[v].label}
          </Link>
        ))}
      </nav>

      {ordered.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {view === "open" ? "Nothing open — no reported problems waiting on anyone." : "No issues here."}
        </p>
      ) : (
        <IssueList
          issues={ordered.map((i) =>
            toIssueRow(
              i,
              [propertyId ? null : propertyDisplayName(i.property), i.reportedBy?.name ?? null]
                .filter(Boolean)
                .join(" · "),
            ),
          )}
          hrefFor={(id) => `/admin/issues/${id}`}
        />
      )}
    </div>
  );
}
