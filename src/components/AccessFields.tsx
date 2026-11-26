"use client";

import { useState } from "react";
import { ACCESS_CODE_LABELS, ACCESS_CODE_MAX, ACCESS_OPTIONS } from "@/lib/accessOptions";
import { inputCompact } from "@/lib/ui";

// The ways into a property. Ticking one that has a code (a key safe, a lockbox,
// a keypad) gives it a box of its own, so the code has a clear place to go and
// can be picked out for whoever is looking at the property.
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
        <div key={o.value} className="flex flex-col gap-1.5">
          <label htmlFor={`accessCode-${o.value}`} className="text-sm font-medium">
            {ACCESS_CODE_LABELS[o.value]}
          </label>
          <input
            id={`accessCode-${o.value}`}
            name={`accessCode_${o.value}`}
            defaultValue={codes[o.value] ?? ""}
            maxLength={ACCESS_CODE_MAX}
            autoComplete="off"
            placeholder="Enter the code"
            className={`${inputCompact} max-w-48`}
          />
        </div>
      ))}
    </fieldset>
  );
}
