"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, inputCompact } from "@/lib/ui";

// Same reveal-on-click shape as AddPropertyForm/EditableNumberField -- a
// form that moves someone's work elsewhere shouldn't sit permanently open
// on their profile, as if reassigning them were the default thing to do
// every time this page loads.
export function ReassignForm({
  action,
  cleaners,
  pendingCount,
}: {
  action: (formData: FormData) => Promise<void>;
  cleaners: { id: string; name: string }[];
  pendingCount: number;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
        Reassign upcoming work
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex flex-wrap items-end gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetCleanerId" className="text-sm font-medium">
          Reassign to
        </label>
        <select id="targetCleanerId" name="targetCleanerId" required autoFocus className={inputCompact}>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fromDate" className="text-sm font-medium">
          From
        </label>
        <input id="fromDate" name="fromDate" type="date" className={`${inputCompact} w-40`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="toDate" className="text-sm font-medium">
          To
        </label>
        <input id="toDate" name="toDate" type="date" className={`${inputCompact} w-40`} />
      </div>
      <button type="submit" disabled={pending} className={button("primary", "sm")}>
        {pending ? "Reassigning…" : "Reassign"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      <p className="w-full text-xs text-zinc-500">
        {pendingCount} upcoming {pendingCount === 1 ? "clean" : "cleans"} not yet started. Leave both
        dates blank to reassign all of them.
      </p>
    </form>
  );
}
