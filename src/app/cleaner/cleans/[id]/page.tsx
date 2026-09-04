import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { formatScheduledFor } from "@/lib/schedule";
import { PropertyDetails } from "@/components/PropertyDetails";
import { CleanLogView } from "@/components/CleanLogView";
import { STOCK_BAND_LABELS, stockLevelBand, type StockLevelBand } from "@/lib/stock";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { nightsSincePreviousClean, estimateStockUsage } from "@/lib/stockEstimate";
import { checkInClean, uploadCleanPhotos, recordStockLevel, completeClean } from "../../actions";

export const metadata = { title: "Clean" };

const STEPS = ["Arrive", "Before", "Clean", "Stock", "Finish"] as const;

// The turnover runs as a forced march: one step on screen at a time, and the
// next only appears once the current one is actually recorded. The step is
// derived from what's been captured rather than stored on the Clean -- a
// column would be a second source of truth that could disagree with the
// photos (and now stock counts) themselves.
function Progress({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={
                "h-1 rounded-full " +
                (done || active ? "bg-zinc-900" : "bg-black/10")
              }
            />
            <span
              className={
                "text-[11px] " + (active ? "font-medium text-zinc-900" : "text-zinc-500")
              }
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PhotoGrid({ paths, alt }: { paths: string[]; alt: string }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {paths.map((path) => (
        <li key={path} className={card("overflow-hidden")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${path}`} alt={alt} className="h-20 w-full object-cover" />
        </li>
      ))}
    </ul>
  );
}

function PhotoUploadStep({
  action,
  heading,
  hint,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  heading: string;
  hint: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className={card("flex flex-col gap-3 p-4")}>
      <div>
        <h2 className="text-sm font-medium">{heading}</h2>
        <p className="mt-1 text-sm text-zinc-600">{hint}</p>
      </div>
      <input
        name="photos"
        type="file"
        accept="image/*"
        multiple
        required
        capture="environment"
        className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
      />
      <button type="submit" className={`w-full ${button("primary", "lg")}`}>
        {submitLabel}
      </button>
    </form>
  );
}

const BAND_ORDER: StockLevelBand[] = ["high", "medium", "low", "none"];

// One item at a time, tap-only: no typing, which is the whole point.
// predicted is highlighted as the fast "this looks right" path; the other
// three bands sit below at equal size, so correcting a wrong guess is still
// exactly one tap, not a reveal-then-tap. Always the same four options in
// the same order for every item, regardless of that item's par -- a
// consistent interface a cleaner can work from muscle memory beats a
// numerically tidier one that changes shape from item to item. (A par of 1
// or 2 doesn't have enough distinct on-hand values to make Medium and Low
// truly different numbers underneath -- see the fallback in
// bandToOnHandQty -- but the choice stays on screen either way.)
function StockLevelStep({
  action,
  itemName,
  unit,
  predicted,
  reason,
  position,
  total,
}: {
  action: (formData: FormData) => void;
  itemName: string;
  unit: string | null;
  predicted: StockLevelBand;
  reason: string;
  position: number;
  total: number;
}) {
  const alternatives = BAND_ORDER.filter((b) => b !== predicted);

  return (
    <form action={action} className={card("flex flex-col gap-4 p-4")}>
      <div>
        <p className="text-xs text-zinc-500">
          Stock {position} of {total}
        </p>
        <h2 className="text-sm font-medium">
          {itemName}
          {unit ? ` (${unit})` : ""}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{reason}</p>
      </div>

      <button
        type="submit"
        name="band"
        value={predicted}
        className={`w-full ${button("primary", "lg")}`}
      >
        Confirm: {STOCK_BAND_LABELS[predicted]}
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">Not right? Pick the actual level:</p>
        <div className="grid grid-cols-3 gap-2">
          {alternatives.map((b) => (
            <button key={b} type="submit" name="band" value={b} className={button("secondary", "md")}>
              {STOCK_BAND_LABELS[b]}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default async function CleanerCleanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCleaner();
  const { id } = await params;

  // Scoped in the query: a clean assigned to someone else simply doesn't
  // resolve, so there's no branch where another cleaner's job could render.
  const clean = await prisma.clean.findFirst({
    where: { id, assignedToId: session.user.id },
    include: {
      property: {
        include: {
          stockLevels: { include: { stockItem: true }, orderBy: { createdAt: "asc" } },
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
      },
      log: {
        include: {
          recordedBy: { select: { name: true } },
          photos: true,
          stockUsage: { include: { stockItem: true } },
        },
      },
    },
  });
  if (!clean) notFound();

  const title = propertyDisplayName(clean.property);
  const referencePhotos = clean.property.images.map((img) => img.path);
  const photos = clean.log?.photos ?? [];
  const before = photos.filter((p) => p.stage === "BEFORE").map((p) => p.path);
  const after = photos.filter((p) => p.stage === "AFTER").map((p) => p.path);

  // Opt-in per property: a place with nothing configured skips straight past
  // this step, so rolling out stock tracking doesn't hold up every turnover
  // everywhere else.
  const stockItems = clean.property.stockLevels;
  const recordedStockItemIds = new Set((clean.log?.stockUsage ?? []).map((u) => u.stockItemId));
  const stockDone =
    stockItems.length === 0 || stockItems.every((s) => recordedStockItemIds.has(s.stockItemId));

  // Computed once per page load (not per item -- the previous-clean lookup
  // is the same for every item on this property), then turned into a
  // predicted High/Medium/Low/None per item below. This never writes
  // anything; it only decides which button is pre-highlighted as "Confirm".
  const nights = clean.scheduledFor
    ? await nightsSincePreviousClean(clean.propertyId, clean.id, clean.scheduledFor)
    : null;
  const guestGuess = clean.guestCount ?? clean.property.maxOccupancy;

  // The next item still needing a level -- stock items are worked through
  // one at a time, in the same fixed order they were configured in, so
  // "item 2 of 3" means the same thing on every reload of this step. Folded
  // into one nullable value (rather than two separately-nullable ones) so
  // the JSX below only has one thing to null-check.
  const nextUp = stockItems.find((l) => !recordedStockItemIds.has(l.stockItemId));
  const currentStockStep = nextUp
    ? (() => {
        const estimate = estimateStockUsage(nights, guestGuess, nextUp);
        const prediction = estimate
          ? {
              band: stockLevelBand({ onHandQty: estimate.estimatedRemaining, parQty: nextUp.parQty }),
              reason: `Estimated from ${estimate.guestCount} ${estimate.guestCount === 1 ? "guest" : "guests"} × ${estimate.nights} ${estimate.nights === 1 ? "night" : "nights"} -- check the shelf.`,
            }
          : {
              band: stockLevelBand(nextUp),
              reason: "Based on what was last recorded -- check the shelf.",
            };
        return { level: nextUp, ...prediction };
      })()
    : null;

  const step =
    clean.status === "PENDING"
      ? 0
      : before.length === 0
        ? 1
        : after.length === 0
          ? 2
          : !stockDone
            ? 3
            : 4;

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

      {clean.status === "IN_PROGRESS" && <Progress current={step} />}

      {clean.instructions && clean.status !== "COMPLETED" && (
        <div className={card("p-4")}>
          <h2 className="mb-1 text-sm font-medium">Instructions</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{clean.instructions}</p>
        </div>
      )}

      {/* Step 1 -- getting in. The access details are the whole point of this
          screen before check-in, so they lead. */}
      {clean.status === "PENDING" && (
        <>
          <PropertyDetails property={clean.property} />
          {referencePhotos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                What it should look like ({referencePhotos.length})
              </h2>
              <PhotoGrid paths={referencePhotos} alt={title} />
            </section>
          )}
          <form action={checkInClean.bind(null, clean.id)}>
            <button type="submit" className={`w-full ${button("primary", "lg")}`}>
              I&apos;ve arrived — check in
            </button>
          </form>
        </>
      )}

      {clean.status === "IN_PROGRESS" && (
        <>
          {clean.arrivedAt && (
            <p className="text-sm text-zinc-600">
              Checked in at {formatScheduledFor(clean.arrivedAt)}.
            </p>
          )}

          {/* Step 2 -- before photos, required before anything else opens up. */}
          {step === 1 && (
            <PhotoUploadStep
              action={uploadCleanPhotos.bind(null, clean.id, "BEFORE")}
              heading="Before photos"
              hint="Photograph the place as you found it, before you touch anything. You'll need these before you can carry on."
              submitLabel="Save before photos"
            />
          )}

          {/* Step 3 -- do the work, then the after shots. */}
          {step === 2 && (
            <>
              <PhotoUploadStep
                action={uploadCleanPhotos.bind(null, clean.id, "AFTER")}
                heading="After photos"
                hint="Once the turnover is done, photograph the finished result."
                submitLabel="Save after photos"
              />
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-zinc-500">Before ({before.length})</h2>
                <PhotoGrid paths={before} alt={title} />
              </section>
            </>
          )}

          {/* Step 4 -- what's on the shelf, one item at a time. Only reached
              when the property actually has items configured; otherwise the
              step is skipped entirely. */}
          {step === 3 && currentStockStep && (
            <StockLevelStep
              action={recordStockLevel.bind(null, clean.id, currentStockStep.level.stockItemId)}
              itemName={currentStockStep.level.stockItem.name}
              unit={currentStockStep.level.stockItem.unit}
              predicted={currentStockStep.band}
              reason={currentStockStep.reason}
              position={recordedStockItemIds.size + 1}
              total={stockItems.length}
            />
          )}

          {/* Step 5 -- write it up and leave. */}
          {step === 4 && (
            <>
              <form
                action={completeClean.bind(null, clean.id)}
                className={card("flex flex-col gap-3 p-4")}
              >
                <div>
                  <h2 className="text-sm font-medium">Notes</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Last step — how you left it, and anything worth flagging.
                  </p>
                </div>
                <textarea
                  name="note"
                  rows={4}
                  required
                  placeholder="How the place was left, anything that needs following up."
                  className={inputCompact}
                />
                <button type="submit" className={`w-full ${button("primary", "lg")}`}>
                  Check out &amp; complete
                </button>
              </form>

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-zinc-500">Before ({before.length})</h2>
                <PhotoGrid paths={before} alt={title} />
                <h2 className="mt-2 text-sm font-medium text-zinc-500">After ({after.length})</h2>
                <PhotoGrid paths={after} alt={title} />
              </section>
            </>
          )}

          {/* Kept to hand throughout -- key safe codes and quirks still matter
              mid-turnover, not just on the doorstep. */}
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-500">Property details</summary>
            <div className="mt-3">
              <PropertyDetails property={clean.property} />
            </div>
          </details>

          {/* Same idea for the reference photos shown on arrival -- worth
              checking back against at any point while cleaning, not just
              once before starting. */}
          {referencePhotos.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500">
                Reference photos ({referencePhotos.length})
              </summary>
              <div className="mt-3">
                <PhotoGrid paths={referencePhotos} alt={title} />
              </div>
            </details>
          )}
        </>
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
