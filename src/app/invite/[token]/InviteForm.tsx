"use client";

import { useActionState, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { button, input } from "@/lib/ui";
import { acceptInvite } from "./actions";

export function InviteForm({ token, name, email }: { token: string; name: string; email: string }) {
  const [error, formAction, pending] = useActionState(acceptInvite.bind(null, token), undefined);
  // Held here so a refused password doesn't wipe the name they corrected.
  const [typedName, setTypedName] = useState(name);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className={input}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          You will sign in with
        </label>
        <input
          id="email"
          type="email"
          readOnly
          value={email}
          autoComplete="username"
          className={`${input} text-zinc-500`}
        />
      </div>
      <PasswordInput
        id="password"
        name="password"
        label="Choose a password"
        autoComplete="new-password"
        hint="At least 8 characters."
        large
      />
      <PasswordInput id="confirmPassword" name="confirmPassword" label="Type it again" autoComplete="new-password" large />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Setting up…" : "Set up and sign in"}
      </button>
    </form>
  );
}
