"use client";

import { useState } from "react";
import { button, card, inputCompact } from "@/lib/ui";

// Same reveal-on-click shape as EditableNumberField -- a dropdown sitting
// open by default reads as part of the page's permanent layout rather than
// an action you take, and looks odd once the list of properties above it is
// non-empty (an always-on form right below a real list).
export function AddPropertyForm({
  action,
  options,
}: {
  action: (formData: FormData) => void;
  options: { id: string; label: string }[];
}) {
  const [adding, setAdding] = useState(false);

  if (!adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} className={button("secondary", "sm")}>
        + Add property
      </button>
    );
  }

  return (
    <form action={action} className={card("flex flex-wrap items-end gap-3 p-4")}>
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
      <button type="submit" className={button("primary", "sm")}>
        Add
      </button>
      <button type="button" onClick={() => setAdding(false)} className={button("ghost", "sm")}>
        Cancel
      </button>
    </form>
  );
}
