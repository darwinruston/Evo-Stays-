"use client";

import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, input } from "@/lib/ui";

// Same reveal-on-click shape as the rest of this page -- name/email/
// password sat with no edit path at all before this, only ever set once at
// creation. Password is optional and never prefilled: leaving it blank
// keeps the current one, same convention as Client.hostifyApiKey.
export function EditCleanerDetailsForm({
  action,
  name,
  email,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  email: string;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
      >
        Edit details
      </button>
    );
  }

  return (
    <form action={submit} className={card("mt-3 flex max-w-sm flex-col gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cleanerName" className="text-sm font-medium">
          Name
        </label>
        <input id="cleanerName" name="name" required autoFocus defaultValue={name} className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cleanerEmail" className="text-sm font-medium">
          Email
        </label>
        <input
          id="cleanerEmail"
          name="email"
          type="email"
          required
          defaultValue={email}
          className={input}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cleanerPassword" className="text-sm font-medium">
          New password
        </label>
        <input
          id="cleanerPassword"
          name="password"
          type="password"
          placeholder="Leave blank to keep the current password"
          className={input}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
