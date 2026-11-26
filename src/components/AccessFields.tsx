"use client";

import { useState } from "react";
import { ACCESS_CODE_LABELS, ACCESS_CODE_MAX, ACCESS_OPTIONS } from "@/lib/accessOptions";
import { inputCompact } from "@/lib/ui";

// The ways into a property. Ticking one that has a code (a key safe, a lockbox,
// a keypad) asks for it straight away, in a box of its own so it can be shown
// clearly to whoever is looking at the property.
export function AccessFields({
  selected,
  codes,
}: {
  selected: string[];
  codes: Record<string, string>;
}) {
  const [ticked, setTicked] = useState(() => new Set(selected));
  const needCode = ACCESS_OPTIONS.filter((o) => ticked.has(o.value) && ACCESS_CODE_LABELS[o.value]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Access</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ACCESS_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="accessOptions"
              value={o.value}
              checked={ticked.has(o.value)}
              onChange={(e) =>
                setTicked((current) => {
                  const next = new Set(current);
                  if (e.target.checked) next.add(o.value);
                  else next.delete(o.value);
                  return next;
                })
              }
            />
            {o.label}
          </label>
        ))}
      </div>

      {needCode.map((o) => (
        <div key={o.value} className="flex flex-col gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 p-3">
          <label htmlFor={`accessCode-${o.value}`} className="text-sm font-medium">
            What is the {ACCESS_CODE_LABELS[o.value].toLowerCase()}?
          </label>
          <input
            id={`accessCode-${o.value}`}
            name={`accessCode_${o.value}`}
            defaultValue={codes[o.value] ?? ""}
            maxLength={ACCESS_CODE_MAX}
            autoComplete="off"
            placeholder="e.g. 4821"
            className={`${inputCompact} max-w-48`}
          />
        </div>
      ))}
    </fieldset>
  );
}
