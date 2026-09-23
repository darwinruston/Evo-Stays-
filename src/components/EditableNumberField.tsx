"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import { button, inputCompact } from "@/lib/ui";

// A number setting that reads as plain text until "Edit" is clicked, rather
// than always sitting open as a live input -- a value that's just been
// saved should look saved, not identical to one still being typed into.
// `action` is a server action (optionally pre-bound with .bind), passed
// straight through as the revealed form's action -- Server Actions can be
// passed as props into a Client Component like this.
export function EditableNumberField({
  id,
  fieldName,
  action,
  value,
  displayValue,
  placeholder,
  step,
}: {
  id: string;
  fieldName: string;
  action: (formData: FormData) => Promise<void>;
  value: number | null;
  displayValue: string;
  placeholder: string;
  step?: string;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{displayValue}</span>
        <button type="button" onClick={() => setOpen(true)} className={button("ghost", "sm")}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col items-start gap-2">
      <div className="flex items-end gap-2">
        <input
          id={id}
          name={fieldName}
          type="number"
          min={0}
          step={step ?? "1"}
          defaultValue={value ?? ""}
          placeholder={placeholder}
          autoFocus
          className={`${inputCompact} w-28`}
        />
        <button type="submit" disabled={pending} className={button("secondary", "sm")}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
