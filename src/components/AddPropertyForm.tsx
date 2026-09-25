"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, inputCompact } from "@/lib/ui";

// Same reveal-on-click shape as EditableNumberField -- a dropdown sitting
// open by default reads as part of the page's permanent layout rather than
// an action you take, and looks odd once the list of properties above it is
// non-empty (an always-on form right below a real list).
export function AddPropertyForm({
  action,
  options,
  cleanerName,
}: {
  action: (formData: FormData) => Promise<void>;
  options: { id: string; label: string }[];
  cleanerName: string;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
        + Add property
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex flex-col gap-3 p-4")}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="propertyId" className="text-sm font-medium">
            Property
          </label>
          <select id="propertyId" name="propertyId" required autoFocus className={inputCompact}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="moveCleans" defaultChecked className="mt-0.5" />
        <span>
          Also move this property&apos;s upcoming cleans to {cleanerName}
          <span className="block text-xs text-zinc-500">
            Only cleans that haven&apos;t started. Untick to leave existing cleans with whoever has them and
            only use {cleanerName} for new ones.
          </span>
        </span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
