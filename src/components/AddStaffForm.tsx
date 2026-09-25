"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, input } from "@/lib/ui";

// Reveal-on-click, closing itself after a successful save like the other
// reveal forms. The password is set by whoever is adding the login and
// passed on to that person -- there's no invite email flow.
export function AddStaffForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
        + Add staff login
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex max-w-sm flex-col gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newStaffName" className="text-sm font-medium">
          Name
        </label>
        <input id="newStaffName" name="name" required autoFocus className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newStaffEmail" className="text-sm font-medium">
          Email
        </label>
        <input id="newStaffEmail" name="email" type="email" required className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newStaffRole" className="text-sm font-medium">
          Access
        </label>
        <select id="newStaffRole" name="role" defaultValue="OFFICE" className={input}>
          <option value="OFFICE">Office — runs the schedule</option>
          <option value="ADMIN">Admin — also manages staff logins</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newStaffPassword" className="text-sm font-medium">
          Initial password
        </label>
        <input
          id="newStaffPassword"
          name="password"
          type="password"
          required
          minLength={8}
          className={input}
        />
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
