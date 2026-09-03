import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { PropertyDetails } from "@/components/PropertyDetails";
import { CleanLogView } from "@/components/CleanLogView";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { requestClean } from "../../actions";

// Scoped like the page itself -- a title is a small leak, but it would still
// confirm another host's property exists.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { clientId } = await requireClientAccount();
  const { id } = await params;
  if (!clientId) return { title: "Property" };
  const property = await prisma.property.findFirst({
    where: { id, clientId },
    select: { name: true, address: true },
  });
  return { title: property ? propertyDisplayName(property) : "Property" };
}

export default async function ClientPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { clientId } = await requireClientAccount();
  const { id } = await params;

  // Scoped by clientId in the query itself rather than fetched-then-checked:
  // another host's property id simply doesn't resolve, so there's no branch
  // left where the wrong record could leak through.
  const property = clientId
    ? await prisma.property.findFirst({
        where: { id, clientId },
        include: {
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          cleans: {
            orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
            include: {
              assignedTo: { select: { name: true } },
              log: { include: { recordedBy: { select: { name: true } }, photos: true } },
            },
          },
        },
      })
    : null;
  if (!property) notFound();

  const title = propertyDisplayName(property);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/client" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← My portfolio
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      </div>

      <PropertyDetails property={property} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Cleans ({property.cleans.length})</h2>

        {property.cleans.length === 0 ? (
          <p className="text-sm text-zinc-600">Nothing booked yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {property.cleans.map((c) => (
              <li key={c.id} className={card("p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {c.scheduledFor ? formatScheduledFor(c.scheduledFor) : "Awaiting a slot"}
                  </span>
                  <span className={badge(c.status === "COMPLETED" ? "solid" : "neutral")}>
                    {CLEAN_STATUS_LABELS[c.status]}
                  </span>
                </div>
                {c.requestedByClientId && (
                  <p className="mt-1 text-xs text-zinc-500">You requested this</p>
                )}
                {c.log && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-zinc-600">
                      What was done
                    </summary>
                    <div className="mt-3">
                      <CleanLogView log={c.log} alt={title} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Request a clean</h2>
        <form
          action={requestClean.bind(null, property.id)}
          className={card("flex max-w-lg flex-col gap-3 p-4")}
        >
          <textarea
            name="clientNote"
            rows={3}
            placeholder="When you'd like it, and anything we should know — guest checkout time, extra linen needed."
            className={inputCompact}
          />
          <div>
            <button type="submit" className={button("primary", "sm")}>
              Send request
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            We&apos;ll confirm a time and assign a cleaner — you&apos;ll see it here once booked.
          </p>
        </form>
      </section>

      {property.images.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Photos</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {property.images.map((img) => (
              <li key={img.id} className={card("overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${img.path}`}
                  alt={title}
                  className="h-32 w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
