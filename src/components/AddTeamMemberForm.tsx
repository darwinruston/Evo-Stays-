"use client";

import { useState } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import type { ActionResult } from "@/lib/actionResult";
import { button, card, input } from "@/lib/ui";

// What each choice lets the person do, shown under the picker as it changes so
// the decision is made with the consequence in front of you.
const ROLES = [
  {
    value: "OFFICE",
    label: "Office",
    does: "Runs the day-to-day: properties, cleans, issues, stock, invoices and clients. Cannot manage the team or Settings.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    does: "Everything Office can do, plus adding and removing team members, company Settings and linen company logins.",
  },
  {
    value: "CLEANER",
    label: "Cleaner",
    does: "Works on their phone and sees only the properties they have cleans at. Set their pay rate and properties on their page afterwards.",
  },
] as const;

// Reveal-on-click, closing itself after a successful save like the other
// reveal forms. The password is set by whoever is adding the person and
// passed on to them: there is no invite email.
export function AddTeamMemberForm({
  action,
  cleanersOnly = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  // Office staff can add cleaners but not the roles with more access.
  cleanersOnly?: boolean;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);
  const roles = cleanersOnly ? ROLES.filter((r) => r.value === "CLEANER") : ROLES;
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>(roles[0].value);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("primary", "sm")}>
        {cleanersOnly ? "+ Add cleaner" : "+ Add team member"}
      </button>
    );
  }

  const chosen = roles.find((r) => r.value === role) ?? roles[0];

  return (
    <form action={submit} className={card("flex max-w-sm flex-col gap-3 p-4")}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newMemberName" className="text-sm font-medium">
          Name
        </label>
        <input id="newMemberName" name="name" required autoFocus className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newMemberEmail" className="text-sm font-medium">
          Email
        </label>
        <input id="newMemberEmail" name="email" type="email" required className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        {cleanersOnly ? (
          <input type="hidden" name="role" value={chosen.value} />
        ) : (
          <>
            <label htmlFor="newMemberRole" className="text-sm font-medium">
              What will they do?
            </label>
            <select
              id="newMemberRole"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className={input}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </>
        )}
        <p className="text-xs text-zinc-500">{chosen.does}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newMemberPassword" className="text-sm font-medium">
          Initial password
        </label>
        <input
          id="newMemberPassword"
          name="password"
          type="password"
          required
          minLength={8}
          className={input}
        />
        <p className="text-xs text-zinc-500">At least 8 characters. Give it to them and they can sign in.</p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Adding…" : "Add to team"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
