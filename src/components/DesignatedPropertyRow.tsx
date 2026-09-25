"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, inputCompact } from "@/lib/ui";

// One designated property, with an optional reveal-on-click form to pick
// up that property's existing upcoming work for this cleaner -- designating
// someone only ever affects new cleans going forward (see
// assignCleanerProperty in src/app/admin/cleaners/actions.ts), so whatever
// was already on the books stays wherever it was unless someone does this.
export function DesignatedPropertyRow({
  propertyName,
  propertyHref,
  clientName,
  cleanerName,
  removeAction,
  moveAction,
  pendingCount,
  flatFee,
  hourlyRate,
  feeAction,
}: {
  propertyName: string;
  propertyHref: string;
  clientName: string;
  cleanerName: string;
  removeAction: (formData: FormData) => void;
  moveAction: (formData: FormData) => Promise<void>;
  pendingCount: number;
  // The agreed flat fee per clean here, or null when paid by the hour.
  flatFee: number | null;
  hourlyRate: number | null;
  feeAction: (formData: FormData) => Promise<void>;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(moveAction);
  const fee = useRevealForm(feeAction);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [movingAll, startMoveAll] = useTransition();

  // No dates at all means every not-yet-started clean here -- the same
  // action as the date form, just with nothing to narrow it.
  function moveAll() {
    setAllError(null);
    startMoveAll(async () => {
      try {
        await moveAction(new FormData());
        setConfirmingAll(false);
      } catch (err) {
        setAllError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <li className={card("flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            <Link href={propertyHref} className="hover:underline">
              {propertyName}
            </Link>
          </p>
          <p className="truncate text-sm text-zinc-500">{clientName}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {flatFee !== null
              ? `Paid £${flatFee.toFixed(2)} per clean, however long it takes`
              : hourlyRate !== null
                ? `Paid by the hour (£${hourlyRate.toFixed(2)}/hr)`
                : "Paid by the hour — no hourly rate set"}{" "}
            {!fee.open && (
              <button
                type="button"
                onClick={() => fee.setOpen(true)}
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-900"
              >
                {flatFee !== null ? "Change" : "Set a flat fee"}
              </button>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {pendingCount > 0 && !open && !confirmingAll && (
            <>
              <button
                type="button"
                onClick={() => setConfirmingAll(true)}
                className="text-xs font-medium text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
              >
                Move all {pendingCount} here
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
              >
                By date…
              </button>
            </>
          )}
          <form action={removeAction}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </form>
        </div>
      </div>

      {fee.open && (
        <form action={fee.submit} className="flex flex-wrap items-end gap-3 border-t border-black/5 pt-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`flatFee-${propertyHref}`} className="text-sm font-medium">
              Flat fee per clean (£)
            </label>
            <input
              id={`flatFee-${propertyHref}`}
              name="flatFee"
              type="number"
              min={0}
              step="0.01"
              autoFocus
              defaultValue={flatFee ?? ""}
              placeholder="e.g. 80"
              className={`${inputCompact} w-32`}
            />
          </div>
          <button type="submit" disabled={fee.pending} className={button("primary", "sm")}>
            {fee.pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => fee.setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
          {fee.error && <p className="w-full text-xs text-red-600">{fee.error}</p>}
          <p className="w-full text-xs text-zinc-500">
            Paid for every completed clean here, whatever time the cleaner spends. Leave blank to pay by
            the hour instead. Only applies to invoices generated from now on.
          </p>
        </form>
      )}

      {confirmingAll && (
        <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-3">
          <p className="text-sm text-zinc-700">
            Move all {pendingCount} upcoming {pendingCount === 1 ? "clean" : "cleans"} at this property to{" "}
            {cleanerName}? Anything already started or finished stays as it is.
          </p>
          <button type="button" onClick={moveAll} disabled={movingAll} className={button("primary", "sm")}>
            {movingAll ? "Moving…" : `Yes, move all ${pendingCount}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmingAll(false);
              setAllError(null);
            }}
            className={button("ghost", "sm")}
          >
            Cancel
          </button>
          {allError && <p className="w-full text-xs text-red-600">{allError}</p>}
        </div>
      )}

      {open && (
        <form action={submit} className="flex flex-wrap items-end gap-3 border-t border-black/5 pt-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`fromDate-${propertyName}`} className="text-sm font-medium">
              From
            </label>
            <input id={`fromDate-${propertyName}`} name="fromDate" type="date" className={`${inputCompact} w-40`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`toDate-${propertyName}`} className="text-sm font-medium">
              To
            </label>
            <input id={`toDate-${propertyName}`} name="toDate" type="date" className={`${inputCompact} w-40`} />
          </div>
          <button type="submit" disabled={pending} className={button("primary", "sm")}>
            {pending ? "Moving…" : "Move"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
          <p className="w-full text-xs text-zinc-500">
            {pendingCount} upcoming {pendingCount === 1 ? "clean" : "cleans"} here not yet assigned to{" "}
            {cleanerName}. Pick a start date, an end date, or both to move just that stretch.
          </p>
        </form>
      )}
    </li>
  );
}
