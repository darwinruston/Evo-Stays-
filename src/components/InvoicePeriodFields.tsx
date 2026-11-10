"use client";

import { useState } from "react";
import { periodShortcuts } from "@/lib/periodShortcuts";
import { inputCompact } from "@/lib/ui";

// The From and To boxes of the invoice form, with one-tap ranges above them:
// Last week, This month, Last month, Year to date. A shortcut just fills in the
// two dates (still editable); the one that matches what is in the boxes is
// shown as chosen. Sends `periodStart` and `periodEnd` as the form always did.
export function InvoicePeriodFields({ initialFrom, initialTo }: { initialFrom: string; initialTo: string }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  // Worked out when the page is used, so "today" is the person's own today.
  const [shortcuts] = useState(() => periodShortcuts());

  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-2" role="group" aria-label="Quick ranges">
        <span className="text-xs text-zinc-500">Quick range</span>
        {shortcuts.map((s) => {
          const chosen = s.from === from && s.to === to;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={chosen}
              onClick={() => {
                setFrom(s.from);
                setTo(s.to);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                chosen
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-black/10 bg-surface text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="periodStart" className="text-xs text-zinc-500">
          From
        </label>
        <input
          id="periodStart"
          name="periodStart"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          className={inputCompact}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="periodEnd" className="text-xs text-zinc-500">
          To
        </label>
        <input
          id="periodEnd"
          name="periodEnd"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className={inputCompact}
        />
      </div>
    </>
  );
}
