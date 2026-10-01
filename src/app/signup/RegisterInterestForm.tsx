"use client";

import { useActionState } from "react";
import { registerInterest, type RegisterInterestState } from "./actions";
import { button, input } from "@/lib/ui";

export function RegisterInterestForm() {
  const [state, formAction, pending] = useActionState<RegisterInterestState, FormData>(
    registerInterest,
    undefined,
  );

  if (state && "success" in state) {
    return (
      <p className="text-sm text-zinc-600">
        Thanks — we&apos;ve got your details and will be in touch as soon as Evo Stays is ready for a
        demo.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
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
        <label htmlFor="companyName" className="text-sm font-medium">
          Company name
        </label>
        <input id="companyName" name="companyName" required placeholder="e.g. Coastal Lets Ltd" className={input} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Tell us about your portfolio <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={3} placeholder="e.g. 15 properties, currently on a spreadsheet" className={input} />
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-full ${button("primary", "md")}`}>
        {pending ? "Submitting…" : "Register interest"}
      </button>
    </form>
  );
}
