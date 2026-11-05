"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "./actions";
import { button, input } from "@/lib/ui";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, formAction, pending] = useActionState(loginAction, undefined);
  // Kept in state so a failed sign-in doesn't wipe the email (React clears an
  // uncontrolled form once its action finishes). The password is cleared, as
  // it should be after a failed attempt.
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        large
        labelAside={
          <Link href="/forgot-password" className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900">
            Forgot password?
          </Link>
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
