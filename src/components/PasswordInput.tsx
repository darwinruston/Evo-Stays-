"use client";

import { useState } from "react";
import { input, inputCompact } from "@/lib/ui";

// A password box with a Show / Hide button, so what has been typed can be
// checked before saving. Hidden again on every visit: it never remembers.
export function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  hint,
  large = false,
  labelAside,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  // The roomier box the sign-in page uses, rather than the compact one.
  large?: boolean;
  // Something to the right of the label, such as "Forgot password?".
  labelAside?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className={`${large ? input : inputCompact} pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
