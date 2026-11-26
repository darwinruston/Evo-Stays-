"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { button, input } from "@/lib/ui";
import type { ActionResult } from "@/lib/actionResult";

// Asks before doing something that cannot be undone. The first press only
// opens the question, saying what will go; the action runs from the second.
// For the biggest deletions, `typeToConfirm` also asks for the name to be
// typed, so it cannot be done on autopilot.
export function ConfirmAction({
  action,
  label,
  question,
  confirmLabel = "Yes, delete",
  appearance = "button",
  typeToConfirm,
  ariaLabel,
}: {
  // May hand back a reason for saying no (see ActionResult).
  action: (formData: FormData) => unknown;
  label: string;
  question: string;
  confirmLabel?: string;
  // "button" for a delete section of its own, "link" for a row in a list,
  // "ghost" beside other quiet buttons.
  appearance?: "button" | "link" | "ghost";
  typeToConfirm?: string;
  ariaLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trigger = {
    button: button("danger", "sm"),
    link: "text-xs text-red-600 hover:underline",
    ghost: button("ghost", "sm"),
  }[appearance];

  if (!asking) {
    const open = (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          setError(null);
          setAsking(true);
        }}
        className={`${trigger} w-fit`}
      >
        {label}
      </button>
    );
    if (!error) return open;
    return (
      <div className="flex max-w-md flex-col items-start gap-1">
        {open}
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      </div>
    );
  }

  const matches = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.trim().toLowerCase();

  return (
    <form
      action={async (formData) => {
        const result = (await action(formData)) as ActionResult;
        // Still here (a list row that stays, or a refusal): close the question,
        // leaving the reason for a refusal beside the button.
        if (result) setError(result.error);
        setAsking(false);
        setTyped("");
      }}
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left"
    >
      <p role="alert" className="text-sm text-red-900">
        {question}
      </p>
      {typeToConfirm && (
        <label className="flex flex-col gap-1 text-sm text-red-900">
          <span>
            Type <strong>{typeToConfirm}</strong> to confirm
          </span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={input} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Go label={confirmLabel} disabled={!matches} />
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            setTyped("");
          }}
          className={button("ghost", "sm")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Go({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${button("primary", "sm")} !bg-red-700 hover:!bg-red-800`}
    >
      {pending ? "Working…" : label}
    </button>
  );
}
