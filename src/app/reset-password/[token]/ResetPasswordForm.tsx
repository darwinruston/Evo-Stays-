"use client";

import { useActionState } from "react";
import { resetPassword } from "./actions";
import { button, input } from "@/lib/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, formAction, pending] = useActionState(resetPassword.bind(null, token), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
