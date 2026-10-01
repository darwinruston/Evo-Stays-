"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { button, input } from "@/lib/ui";

// Always ends in the same generic message after submitting -- see the
// comment on GENERIC_MESSAGE in ./actions.ts for why -- so there's no
// separate "sent" vs "error" state to show here beyond the odd case of an
// empty field, which the message itself already covers either way.
export function ForgotPasswordForm() {
  const [message, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>

      {message && <p className="text-sm text-zinc-600">{message}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
