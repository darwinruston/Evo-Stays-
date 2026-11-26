"use client";

import { useState, useTransition } from "react";
import type { InviteResult } from "@/lib/invites";
import { InviteLinkCard } from "@/components/InviteLinkCard";
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
// reveal forms. By default the person gets a personal link and chooses their
// own password, and the form is replaced by that link to send on. Typing a
// password for them is still there for anyone who can't use a link.
export function AddTeamMemberForm({
  action,
  cleanersOnly = false,
}: {
  action: (formData: FormData) => Promise<InviteResult>;
  // Office staff can add cleaners but not the roles with more access.
  cleanersOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<"invite" | "password">("invite");
  const [made, setMade] = useState<{ link: string; name: string } | null>(null);
  const roles = cleanersOnly ? ROLES.filter((r) => r.value === "CLEANER") : ROLES;
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>(roles[0].value);

  // Sent by hand rather than as the form's action, so a refused entry keeps
  // what was typed.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && "error" in result) {
          setError(result.error);
          return;
        }
        if (result) setMade({ link: result.inviteLink, name: result.name });
        setOpen(false);
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  if (made) {
    return <InviteLinkCard link={made.link} name={made.name} onDone={() => setMade(null)} />;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("primary", "sm")}>
        {cleanersOnly ? "+ Add cleaner" : "+ Add team member"}
      </button>
    );
  }

  const chosen = roles.find((r) => r.value === role) ?? roles[0];

  return (
    <form onSubmit={submit} className={card("flex max-w-sm flex-col gap-3 p-4")}>
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
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">How do they sign in first?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="method"
            value="invite"
            checked={method === "invite"}
            onChange={() => setMethod("invite")}
            className="mt-1 accent-zinc-900"
          />
          <span>
            Send them an invite link
            <span className="block text-xs text-zinc-500">They choose their own password.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="method"
            value="password"
            checked={method === "password"}
            onChange={() => setMethod("password")}
            className="mt-1 accent-zinc-900"
          />
          <span>
            I&apos;ll set a password
            <span className="block text-xs text-zinc-500">You pass it on to them.</span>
          </span>
        </label>
      </fieldset>
      {method === "password" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="newMemberPassword" className="text-sm font-medium">
            Initial password
          </label>
          <input id="newMemberPassword" name="password" type="password" required minLength={8} className={input} />
          <p className="text-xs text-zinc-500">At least 8 characters. Give it to them and they can sign in.</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Adding…" : method === "invite" ? "Add and get link" : "Add to team"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
