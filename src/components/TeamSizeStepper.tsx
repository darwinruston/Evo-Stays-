"use client";

import { useState } from "react";
import { TEAM_SIZE_MAX, teamLabel } from "@/lib/teamSize";

// "How many of you are cleaning?" with big plus and minus buttons, for a thumb
// on a phone. Sends its value as a hidden field called `name` inside whatever
// form it sits in.
export function TeamSizeStepper({
  name = "teamSize",
  defaultValue = 1,
  compact = false,
}: {
  name?: string;
  defaultValue?: number;
  compact?: boolean;
}) {
  const [size, setSize] = useState(defaultValue);
  const buttonSize = compact ? "h-9 w-9 text-lg" : "h-12 w-12 text-2xl";

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={size} />
      <button
        type="button"
        onClick={() => setSize((s) => Math.max(1, s - 1))}
        disabled={size <= 1}
        aria-label="One fewer person"
        className={`flex ${buttonSize} items-center justify-center rounded-full border border-black/10 bg-surface font-medium text-zinc-900 transition-colors hover:bg-black/[0.04] disabled:opacity-30`}
      >
        −
      </button>
      <div className="min-w-24 text-center" aria-live="polite">
        <p className={compact ? "text-xl font-semibold" : "text-3xl font-semibold"}>{size}</p>
        <p className="text-xs text-zinc-500">{teamLabel(size)}</p>
      </div>
      <button
        type="button"
        onClick={() => setSize((s) => Math.min(TEAM_SIZE_MAX, s + 1))}
        disabled={size >= TEAM_SIZE_MAX}
        aria-label="One more person"
        className={`flex ${buttonSize} items-center justify-center rounded-full border border-black/10 bg-surface font-medium text-zinc-900 transition-colors hover:bg-black/[0.04] disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}
