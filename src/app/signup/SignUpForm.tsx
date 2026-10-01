"use client";

import { useActionState } from "react";
import { signUp } from "./actions";
import { button, input } from "@/lib/ui";

export function SignUpForm() {
  const [error, formAction, pending] = useActionState(signUp, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="orgName" className="text-sm font-medium">
          Company name
        </label>
        <input id="orgName" name="orgName" required placeholder="e.g. Coastal Lets Ltd" className={input} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-black/5 pt-4">
        <label htmlFor="name" className="text-sm font-medium">
          Your name
        </label>
        <input id="name" name="name" required autoComplete="name" className={input} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
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
        <p className="text-xs text-zinc-500">At least 8 characters.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Creating your account…" : "Start free trial"}
      </button>
    </form>
  );
}
