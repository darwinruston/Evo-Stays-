"use client";

import { useState } from "react";
import { button, card, inputCompact } from "@/lib/ui";

// One designated property, with an optional reveal-on-click form to pick
// up that property's existing upcoming work for this cleaner -- designating
// someone only ever affects new cleans going forward (see
// assignCleanerProperty in src/app/admin/cleaners/actions.ts), so whatever
// was already on the books stays wherever it was unless someone does this.
export function DesignatedPropertyRow({
  propertyName,
  clientName,
  cleanerName,
  removeAction,
  moveAction,
  pendingCount,
}: {
  propertyName: string;
  clientName: string;
  cleanerName: string;
  removeAction: (formData: FormData) => void;
  moveAction: (formData: FormData) => void;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className={card("flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{propertyName}</p>
          <p className="truncate text-sm text-zinc-500">{clientName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {pendingCount > 0 && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
            >
              Move cleans here
            </button>
          )}
          <form action={removeAction}>
            <button type="submit" className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </form>
        </div>
      </div>

      {open && (
        <form action={moveAction} className="flex flex-wrap items-end gap-3 border-t border-black/5 pt-3">
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
          <button type="submit" className={button("primary", "sm")}>
            Move
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
          <p className="w-full text-xs text-zinc-500">
            {pendingCount} upcoming {pendingCount === 1 ? "clean" : "cleans"} here not yet assigned to{" "}
            {cleanerName}. Leave both dates blank to move all of them.
          </p>
        </form>
      )}
    </li>
  );
}
