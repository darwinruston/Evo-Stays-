"use client";

import { useState, useTransition } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import { badge, button, card, input } from "@/lib/ui";

// One staff login: name/email/role, with reveal-on-click edit and a
// two-step remove (so it can't be one stray click). Password is never
// prefilled -- blank on save keeps the current one.
export function StaffRow({
  name,
  email,
  role,
  isSelf,
  updateAction,
  removeAction,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "OFFICE";
  isSelf: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(updateAction);
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();

  function remove() {
    setRemoveError(null);
    startRemove(async () => {
      try {
        await removeAction();
      } catch (err) {
        setRemoveError(err instanceof Error ? err.message : "Something went wrong.");
        setConfirming(false);
      }
    });
  }

  return (
    <li className={card("flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            {name}
            <span className={badge(role === "ADMIN" ? "solid" : "neutral")}>
              {role === "ADMIN" ? "Admin" : "Office"}
            </span>
            {isSelf && <span className="text-xs font-normal text-zinc-500">You</span>}
          </p>
          <p className="truncate text-sm text-zinc-500">{email}</p>
        </div>
        {!open && (
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
            >
              Edit
            </button>
            {!isSelf &&
              (confirming ? (
                <span className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={remove}
                    disabled={removing}
                    className="font-medium text-red-600 hover:underline"
                  >
                    {removing ? "Removing…" : "Yes, remove"}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:underline">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              ))}
          </div>
        )}
      </div>

      {removeError && <p className="text-xs text-red-600">{removeError}</p>}

      {open && (
        <form action={submit} className="flex max-w-sm flex-col gap-3 border-t border-black/5 pt-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`staffName-${email}`} className="text-sm font-medium">
              Name
            </label>
            <input id={`staffName-${email}`} name="name" required autoFocus defaultValue={name} className={input} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`staffEmail-${email}`} className="text-sm font-medium">
              Email
            </label>
            <input
              id={`staffEmail-${email}`}
              name="email"
              type="email"
              required
              defaultValue={email}
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`staffRole-${email}`} className="text-sm font-medium">
              Access
            </label>
            {isSelf ? (
              <>
                <input type="hidden" name="role" value={role} />
                <p className="text-sm text-zinc-600">
                  {role === "ADMIN" ? "Admin" : "Office"} (you can&apos;t change your own)
                </p>
              </>
            ) : (
              <select id={`staffRole-${email}`} name="role" defaultValue={role} className={input}>
                <option value="OFFICE">Office — runs the schedule</option>
                <option value="ADMIN">Admin — also manages staff logins</option>
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`staffPassword-${email}`} className="text-sm font-medium">
              New password
            </label>
            <input
              id={`staffPassword-${email}`}
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
      )}
    </li>
  );
}
