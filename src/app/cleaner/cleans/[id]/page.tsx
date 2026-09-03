import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { PropertyDetails } from "@/components/PropertyDetails";
import { CleanLogView } from "@/components/CleanLogView";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { checkInClean, completeClean } from "../../actions";

export const metadata = { title: "Clean" };

export default async function CleanerCleanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCleaner();
  const { id } = await params;

  // Scoped in the query: a clean assigned to someone else simply doesn't
  // resolve, so there's no branch where another cleaner's job could render.
  const clean = await prisma.clean.findFirst({
    where: { id, assignedToId: session.user.id },
    include: {
      property: true,
      log: { include: { recordedBy: { select: { name: true } }, photos: true } },
    },
  });
  if (!clean) notFound();

  const title = propertyDisplayName(clean.property);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cleaner" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← My cleans
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
          {clean.scheduledFor ? formatScheduledFor(clean.scheduledFor) : "Not scheduled"}
          <span className={badge(clean.status === "COMPLETED" ? "solid" : "neutral")}>
            {CLEAN_STATUS_LABELS[clean.status]}
          </span>
        </p>
      </div>

      {clean.instructions && (
        <div className={card("p-4")}>
          <h2 className="mb-1 text-sm font-medium">Instructions</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{clean.instructions}</p>
        </div>
      )}

      <PropertyDetails property={clean.property} />

      {clean.status === "PENDING" && (
        <form action={checkInClean.bind(null, clean.id)}>
          <button type="submit" className={`w-full ${button("primary", "lg")}`}>
            Check in
          </button>
        </form>
      )}

      {clean.status === "IN_PROGRESS" && (
        <form action={completeClean.bind(null, clean.id)} className="flex flex-col gap-4">
          {clean.arrivedAt && (
            <p className="text-sm text-zinc-600">
              Checked in at {formatScheduledFor(clean.arrivedAt)}.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="beforePhotos" className="text-sm font-medium">
              Before photos
            </label>
            <input
              id="beforePhotos"
              name="beforePhotos"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="afterPhotos" className="text-sm font-medium">
              After photos
            </label>
            <input
              id="afterPhotos"
              name="afterPhotos"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="note"
              name="note"
              rows={4}
              required
              placeholder="How the place was left, anything that needs following up, stock running low."
              className={inputCompact}
            />
          </div>

          <button type="submit" className={`w-full ${button("primary", "lg")}`}>
            Check out &amp; complete
          </button>
        </form>
      )}

      {clean.status === "COMPLETED" && clean.log && (
        <section className="flex flex-col gap-3 border-t border-black/5 pt-6">
          <h2 className="text-sm font-medium text-zinc-500">What you recorded</h2>
          <CleanLogView log={clean.log} alt={title} />
        </section>
      )}

      {clean.status === "CANCELLED" && (
        <p className="text-sm text-zinc-600">This clean was cancelled — nothing to do.</p>
      )}
    </div>
  );
}
