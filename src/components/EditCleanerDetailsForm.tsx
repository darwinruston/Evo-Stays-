"use client";

import { useState } from "react";
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
  action: (formData: FormData) => void;
  name: string;
  email: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-1 text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
      >
        Edit details
      </button>
    );
  }

  return (
    <form action={action} className={card("mt-3 flex max-w-sm flex-col gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cleanerName" className="text-sm font-medium">
          Name
        </label>
        <input id="cleanerName" name="name" required defaultValue={name} className={input} />
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
      <div className="flex items-center gap-2">
        <button type="submit" className={button("primary", "sm")}>
          Save changes
        </button>
        <button type="button" onClick={() => setEditing(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
