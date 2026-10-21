"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import type { ActionResult } from "@/lib/actionResult";
import { button, card, inputCompact } from "@/lib/ui";

// Reveal-on-click, like the staff login form. Whoever adds the login sets
// the first password and passes it on: there's no invite email flow.
export function AddLinenLoginForm({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
        + Add a login for this company
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex max-w-sm flex-col gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="linenName" className="text-sm font-medium">
          Name
        </label>
        <input id="linenName" name="name" required autoFocus className={inputCompact} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="linenEmail" className="text-sm font-medium">
          Email
        </label>
        <input id="linenEmail" name="email" type="email" required className={inputCompact} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="linenPassword" className="text-sm font-medium">
          Initial password
        </label>
        <input id="linenPassword" name="password" type="password" required minLength={8} className={inputCompact} />
        <p className="text-xs text-zinc-500">At least 8 characters.</p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Adding…" : "Add login"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
