"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/Icons";

// A submit button styled by whoever uses it (a main button, a ✕, a text link,
// one of a row of choices) that shows it is working: a spinner takes the place
// of the label, the button keeps its size so nothing jumps, and it cannot be
// pressed twice. Must be inside the <form> or <ActionForm> it sends. Where the
// wording itself should change ("Saving…"), use SubmitButton.
export function PendingButton({ children, className = "", disabled, ...props }: React.ComponentProps<"button">) {
  const { pending, data } = useFormStatus();
  // Where one form has several buttons, only the one pressed spins.
  const busy = pending && (!props.name || data?.get(props.name) === props.value);

  return (
    <button
      type="submit"
      {...props}
      disabled={disabled || pending}
      aria-busy={busy || undefined}
      className={`relative aria-busy:!opacity-80 ${className}`}
    >
      <span className={busy ? "invisible contents" : "contents"}>{children}</span>
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="h-4 w-4" />
          <span className="sr-only">Working…</span>
        </span>
      )}
    </button>
  );
}
