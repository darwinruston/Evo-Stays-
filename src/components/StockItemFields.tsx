"use client";

import { useState } from "react";
import { suggestStockArea } from "@/lib/stockAreaSuggest";
import { inputCompact } from "@/lib/ui";

// The name and "where is it kept" fields of a stock item. As the name is
// typed, the area is picked for you from where such things are usually kept
// ("Toilet roll" gives Bathroom), which is faster; change the area yourself
// and it stops guessing. An item that already has an area keeps it.
export function StockItemFields({
  areas,
  initialName = "",
  initialAreaId = "",
  namePlaceholder,
}: {
  areas: { id: string; name: string }[];
  initialName?: string;
  initialAreaId?: string;
  namePlaceholder?: string;
}) {
  const [areaId, setAreaId] = useState(initialAreaId);
  // Once someone has picked an area (or one was already saved) it is theirs.
  const [chosenByPerson, setChosenByPerson] = useState(initialAreaId !== "");
  const [suggestedId, setSuggestedId] = useState<string | null>(null);

  function onNameChange(name: string) {
    const suggestion = suggestStockArea(name, areas);
    setSuggestedId(suggestion);
    if (!chosenByPerson) setAreaId(suggestion ?? "");
  }

  const suggested = areas.find((a) => a.id === suggestedId) ?? null;
  const usingSuggestion = !chosenByPerson && suggested !== null && areaId === suggested.id;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialName}
          placeholder={namePlaceholder}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="off"
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="areaId" className="text-sm font-medium">
          Where is it kept?
        </label>
        <select
          id="areaId"
          name="areaId"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            setChosenByPerson(true);
          }}
          className={inputCompact}
        >
          <option value="">No area yet</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500" aria-live="polite">
          {usingSuggestion
            ? `Suggested from the name: ${suggested.name}. Change it if it is kept somewhere else.`
            : areas.length === 0
              ? "Add areas on the Stock items page first, and cleaners can check stock room by room."
              : "Cleaners check stock area by area, so this decides where in the walk it comes. Add or reorder areas on the Stock items page."}
        </p>
      </div>
    </>
  );
}
